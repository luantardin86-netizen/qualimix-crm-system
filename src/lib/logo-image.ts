export const MAX_LOGO_UPLOAD_BYTES = 2 * 1024 * 1024

export type LogoImageFormat = {
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  extension: 'png' | 'jpg' | 'webp'
}

function hasBytes(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value)
}

/** Identifica o formato pelos bytes reais e confere o MIME declarado pelo cliente. */
export function detectLogoImage(
  declaredMimeType: string,
  bytes: Uint8Array,
): LogoImageFormat | null {
  let detected: LogoImageFormat | null = null

  if (bytes.length >= 8 && hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    detected = { mimeType: 'image/png', extension: 'png' }
  } else if (bytes.length >= 3 && hasBytes(bytes, [0xff, 0xd8, 0xff]) ) {
    detected = { mimeType: 'image/jpeg', extension: 'jpg' }
  } else if (
    bytes.length >= 12
    && hasBytes(bytes, [0x52, 0x49, 0x46, 0x46])
    && hasBytes(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    detected = { mimeType: 'image/webp', extension: 'webp' }
  }

  if (!detected) return null
  if (declaredMimeType && declaredMimeType !== detected.mimeType) return null
  return detected
}
