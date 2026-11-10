import { randomUUID } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { assertSameOrigin, requireAdmin, requireCurrentProfile } from '../lib/auth.server'
import { detectLogoImage, MAX_LOGO_UPLOAD_BYTES } from '../lib/logo-image'

const BUCKET = 'qualimix-branding'

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status })
}

export const Route = createFileRoute('/api/logo-upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertSameOrigin()
        } catch {
          return errorResponse('Solicitação de origem inválida.', 403)
        }

        let profile
        try {
          profile = await requireCurrentProfile()
        } catch {
          return errorResponse('Sua sessão expirou. Entre novamente.', 401)
        }

        try {
          requireAdmin(profile)
        } catch {
          return errorResponse('Apenas o administrador pode alterar a logo.', 403)
        }

        const contentLength = Number(request.headers.get('content-length') ?? 0)
        if (Number.isFinite(contentLength) && contentLength > MAX_LOGO_UPLOAD_BYTES + 64 * 1024) {
          return errorResponse('O arquivo excede o limite de 2 MB.', 413)
        }

        let formData: FormData
        try {
          formData = await request.formData()
        } catch {
          return errorResponse('Não foi possível ler o arquivo enviado.', 400)
        }

        const file = formData.get('file')
        if (typeof File === 'undefined' || !(file instanceof File)) {
          return errorResponse('Selecione uma imagem para enviar.', 400)
        }
        if (file.size <= 0 || file.size > MAX_LOGO_UPLOAD_BYTES) {
          return errorResponse('A logo precisa ter entre 1 byte e 2 MB.', 413)
        }

        const bytes = new Uint8Array(await file.arrayBuffer())
        const image = detectLogoImage(file.type, bytes)
        if (!image) {
          return errorResponse('Arquivo inválido. Envie uma imagem PNG, JPG ou WebP válida.', 415)
        }

        const rawSupabaseUrl = process.env.SUPABASE_URL?.trim()
        const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()
          || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
        if (!rawSupabaseUrl || !secretKey) {
          return errorResponse(
            'O upload ainda não está configurado no servidor. Defina SUPABASE_URL e SUPABASE_SECRET_KEY nas variáveis de ambiente.',
            503,
          )
        }

        let supabaseUrl: URL
        try {
          supabaseUrl = new URL(rawSupabaseUrl)
          if (
            supabaseUrl.protocol !== 'https:'
            || supabaseUrl.username
            || supabaseUrl.password
            || supabaseUrl.search
            || supabaseUrl.hash
            || supabaseUrl.pathname !== '/'
          ) {
            throw new Error('URL inválida')
          }
        } catch {
          return errorResponse('SUPABASE_URL precisa ser uma URL HTTPS válida do projeto.', 503)
        }

        const objectPath = 'company-logo/' + randomUUID() + '.' + image.extension
        const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/')
        const uploadUrl = new URL(
          '/storage/v1/object/' + BUCKET + '/' + encodedPath,
          supabaseUrl.origin,
        )

        let storageResponse: Response
        try {
          storageResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              apikey: secretKey,
              // As novas chaves sb_secret_ não são JWTs. Só o service_role legado
              // precisa do Authorization Bearer; com secret key o gateway usa apikey.
              ...(secretKey.startsWith('sb_secret_')
                ? {}
                : { Authorization: 'Bearer ' + secretKey }),
              'Content-Type': image.mimeType,
              'Cache-Control': '31536000',
            },
            body: bytes,
          })
        } catch {
          return errorResponse('Não foi possível conectar ao Supabase Storage.', 502)
        }

        if (!storageResponse.ok) {
          if (storageResponse.status === 404) {
            return errorResponse('O bucket qualimix-branding não foi encontrado no Supabase Storage.', 503)
          }
          if (storageResponse.status === 401 || storageResponse.status === 403) {
            return errorResponse('O Supabase recusou a credencial de Storage. Confira SUPABASE_SECRET_KEY.', 503)
          }
          if (storageResponse.status === 413) {
            return errorResponse('O Supabase recusou a imagem por exceder o limite de tamanho.', 413)
          }
          return errorResponse('O Supabase Storage não aceitou o upload. Tente novamente.', 502)
        }

        const publicUrl = new URL(
          '/storage/v1/object/public/' + BUCKET + '/' + encodedPath,
          supabaseUrl.origin,
        )
        return Response.json({ logoUrl: publicUrl.toString() }, { status: 201 })
      },
    },
  },
})
