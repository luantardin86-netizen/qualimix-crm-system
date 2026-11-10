import type { CatalogItem, CommercialRules } from '../lib/quote'

/**
 * Catálogo inicial. `basePrice` é o preço oficial e permanece null até a
 * Qualimix confirmar a tabela comercial. `demoPrice` é FICTÍCIO e só é usado
 * quando o modo demonstração está ativo.
 */
export const catalog: CatalogItem[] = [
  { id: 'c-fck20', code: 'CON-20', name: 'Concreto usinado FCK 20 MPa', category: 'concreto', unit: 'm³', description: 'Concreto usinado convencional, resistência característica de 20 MPa', basePrice: null, demoPrice: 395, fck: 20, active: true, validFrom: null },
  { id: 'c-fck25', code: 'CON-25', name: 'Concreto usinado FCK 25 MPa', category: 'concreto', unit: 'm³', description: 'Concreto usinado convencional, resistência característica de 25 MPa', basePrice: null, demoPrice: 420, fck: 25, active: true, validFrom: null },
  { id: 'c-fck30', code: 'CON-30', name: 'Concreto usinado FCK 30 MPa', category: 'concreto', unit: 'm³', description: 'Concreto usinado convencional, resistência característica de 30 MPa', basePrice: null, demoPrice: 450, fck: 30, active: true, validFrom: null },
  { id: 'p-polido', code: 'PIS-POL', name: 'Piso de concreto polido', category: 'piso', unit: 'm²', description: 'Execução de piso com acabamento polido', basePrice: null, demoPrice: 68, finish: 'polido', active: true, validFrom: null },
  { id: 'p-sarraf', code: 'PIS-SAR', name: 'Piso de concreto sarrafeado', category: 'piso', unit: 'm²', description: 'Execução de piso com acabamento sarrafeado', basePrice: null, demoPrice: 42, finish: 'sarrafeado', active: true, validFrom: null },
  { id: 's-bomba', code: 'SRV-BOM', name: 'Bombeamento (item avulso)', category: 'bombeamento', unit: 'un', description: 'Serviço de bombeamento lançado como item. Prefira a regra de bombeamento.', basePrice: null, demoPrice: 900, active: true, validFrom: null },
  { id: 's-frete', code: 'SRV-FRE', name: 'Frete (item avulso)', category: 'frete', unit: 'viagem', description: 'Frete lançado como item. Prefira a regra de frete.', basePrice: null, demoPrice: 180, active: true, validFrom: null },
  { id: 's-estadia', code: 'SRV-EST', name: 'Estadia (item avulso)', category: 'estadia', unit: 'h', description: 'Hora adicional de caminhão na obra', basePrice: null, demoPrice: 220, active: true, validFrom: null },
  { id: 's-lancamento', code: 'SRV-LAN', name: 'Serviço extra de lançamento', category: 'servico', unit: 'h', description: 'Mão de obra adicional de lançamento', basePrice: null, demoPrice: 150, active: true, validFrom: null },
  { id: 'm-fibra', code: 'MAT-FIB', name: 'Adição de fibra', category: 'material', unit: 'm³', description: 'Adição de fibra ao concreto', basePrice: null, demoPrice: 38, active: true, validFrom: null },
]

/** Regras oficiais: nada confirmado ainda pela Qualimix → tudo pendente. */
export const officialRules: CommercialRules = {
  freight: {
    fixed: null,
    perKm: null,
    regions: [
      { id: 'r-centro', name: 'Região Central', price: null },
      { id: 'r-norte', name: 'Região Norte', price: null },
      { id: 'r-sul', name: 'Região Sul', price: null },
    ],
  },
  pumping: { fixed: null, perM3: null, perHour: null, minimum: null },
  minVolume: { m3: null, chargeDifference: false, minOrderValue: null },
  stay: { toleranceMin: null, perHour: null },
  floor: { minArea: null },
  maxDiscountPctWithoutApproval: null,
  validityDays: null,
  quantityDecimals: 2,
}

/** Regras FICTÍCIAS — exclusivas do modo demonstração. */
export const demoRules: CommercialRules = {
  freight: {
    fixed: 250,
    perKm: 6.5,
    regions: [
      { id: 'r-centro', name: 'Região Central', price: 150 },
      { id: 'r-norte', name: 'Região Norte', price: 280 },
      { id: 'r-sul', name: 'Região Sul', price: 320 },
    ],
  },
  pumping: { fixed: 950, perM3: 28, perHour: 310, minimum: 700 },
  minVolume: { m3: 3, chargeDifference: true, minOrderValue: null },
  stay: { toleranceMin: 30, perHour: 220 },
  floor: { minArea: 50 },
  maxDiscountPctWithoutApproval: 5,
  validityDays: 15,
  quantityDecimals: 2,
}

export interface PaymentMethod {
  id: string
  label: string
  /** null = ainda não confirmado pela Qualimix */
  enabledOfficial: boolean | null
  enabledDemo: boolean
}

export const paymentMethods: PaymentMethod[] = [
  { id: 'pix', label: 'Pix', enabledOfficial: null, enabledDemo: true },
  { id: 'boleto', label: 'Boleto', enabledOfficial: null, enabledDemo: true },
  { id: 'cartao', label: 'Cartão', enabledOfficial: null, enabledDemo: false },
  { id: 'transferencia', label: 'Transferência', enabledOfficial: null, enabledDemo: true },
  { id: 'faturamento', label: 'Faturamento', enabledOfficial: null, enabledDemo: false },
]

/** Dados institucionais: preenchidos pelo administrador. Nada é inventado. */
export const company = {
  tradeName: 'Qualimix',
  legalName: null as string | null,
  cnpj: null as string | null,
  address: null as string | null,
  phone: null as string | null,
  email: null as string | null,
  logoUrl: null as string | null,
}

export const leadSources = [
  'Não informado',
  'WhatsApp 1',
  'WhatsApp 2',
  'Instagram',
  'Indicação',
  'Telefone',
  'Outros',
] as const

export const regions = ['Região Central', 'Região Norte', 'Região Sul']

export const clientTypes = [
  'Pessoa física',
  'Empresa',
  'Construtora',
  'Empreiteiro',
  'Outro',
] as const

export const elementTypes = [
  'Laje',
  'Laje H8',
  'Laje H10',
  'Laje H12',
  'Laje H15',
  'Laje H20',
  'Viga',
  'Viga baldrame',
  'Pilar',
  'Sapata',
  'Estaca',
  'Tubulão',
  'Radier',
  'Contrapiso',
  'Piso',
  'Calçada',
  'Baldrame',
  'Escada',
  'Outro',
]

export const funnelStages = [
  { id: 'novo', label: 'Novo lead' },
  { id: 'atendimento', label: 'Em atendimento' },
  { id: 'levantamento', label: 'Levantamento de informações' },
  { id: 'elaboracao', label: 'Orçamento em elaboração' },
  { id: 'enviado', label: 'Orçamento enviado' },
  { id: 'negociacao', label: 'Em negociação' },
  { id: 'fechado', label: 'Fechado' },
  { id: 'perdido', label: 'Perdido' },
] as const
export type StageId = (typeof funnelStages)[number]['id']

export const lossReasons = [
  'Preço',
  'Prazo de entrega',
  'Fechou com concorrente',
  'Obra adiada ou cancelada',
  'Sem retorno do cliente',
  'Fora da região atendida',
  'Outro',
]

export interface CompanySettings {
  tradeName: string
  legalName: string | null
  cnpj: string | null
  address: string | null
  phone: string | null
  email: string | null
  logoUrl: string | null
}

export type FunnelStageSetting = { id: StageId; label: string }

export interface AppSettings {
  catalog: CatalogItem[]
  officialRules: CommercialRules
  demoRules: CommercialRules
  paymentMethods: PaymentMethod[]
  company: CompanySettings
  leadSources: string[]
  regions: string[]
  funnelStages: FunnelStageSetting[]
  lossReasons: string[]
  clientTypes: string[]
  elementTypes: string[]
}

function copyRules(rules: CommercialRules): CommercialRules {
  return {
    ...rules,
    freight: { ...rules.freight, regions: rules.freight.regions.map((region) => ({ ...region })) },
    pumping: { ...rules.pumping },
    minVolume: { ...rules.minVolume },
    stay: { ...rules.stay },
    floor: { ...rules.floor },
  }
}

export function createDefaultSettings(): AppSettings {
  return {
    catalog: catalog.map((item) => ({ ...item })),
    officialRules: copyRules(officialRules),
    demoRules: copyRules(demoRules),
    paymentMethods: paymentMethods.map((method) => ({ ...method })),
    company: { ...company },
    leadSources: [...leadSources],
    regions: [...regions],
    funnelStages: funnelStages.map((stage) => ({ ...stage })),
    lossReasons: [...lossReasons],
    clientTypes: [...clientTypes],
    elementTypes: [...elementTypes],
  }
}
