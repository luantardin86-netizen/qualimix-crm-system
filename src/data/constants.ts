import type { CatalogItem } from '../lib/quote'

/** Rótulos de categorias do catálogo; não são configurações comerciais editáveis. */
export const categoryLabel: Record<CatalogItem['category'], string> = {
  concreto: 'Concreto',
  piso: 'Piso',
  bombeamento: 'Bombeamento',
  frete: 'Frete',
  estadia: 'Estadia',
  servico: 'Serviço',
  material: 'Material',
  equipamento: 'Equipamento',
}

/** Status do ciclo de vida do orçamento; não são listas de apoio editáveis. */
export const quoteStatuses = [
  'Rascunho',
  'Aguardando informações',
  'Aguardando aprovação',
  'Aprovado internamente',
  'Enviado ao cliente',
  'Em negociação',
  'Aceito',
  'Recusado',
  'Expirado',
  'Cancelado',
] as const
export type QuoteStatus = (typeof quoteStatuses)[number]
