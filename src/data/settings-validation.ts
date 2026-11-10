import { createDefaultSettings, type AppSettings, type CompanySettings, type PaymentMethod } from './settings'
import type { CatalogItem, CommercialRules } from '../lib/quote'

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeRules(base: CommercialRules, value: unknown): CommercialRules {
  if (!isRecord(value)) return copyRules(base)
  const raw = value as Partial<CommercialRules>
  const freight: Record<string, unknown> = isRecord(raw.freight) ? raw.freight : {}
  const pumping = isRecord(raw.pumping) ? raw.pumping : {}
  const minVolume = isRecord(raw.minVolume) ? raw.minVolume : {}
  const stay = isRecord(raw.stay) ? raw.stay : {}
  const floor = isRecord(raw.floor) ? raw.floor : {}
  return {
    ...base,
    ...raw,
    freight: {
      ...base.freight,
      ...freight,
      regions: Array.isArray(freight.regions) ? freight.regions as CommercialRules['freight']['regions'] : base.freight.regions.map((region) => ({ ...region })),
    },
    pumping: { ...base.pumping, ...pumping },
    minVolume: { ...base.minVolume, ...minVolume },
    stay: { ...base.stay, ...stay },
    floor: { ...base.floor, ...floor },
  }
}

/** Mescla configurações salvas sem perder campos novos adicionados em versões futuras. */
export function normalizeSettings(value: unknown): AppSettings {
  const base = createDefaultSettings()
  if (!isRecord(value)) return base
  const raw = value as Partial<AppSettings>
  const stringList = (input: unknown, fallback: string[]) =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [...fallback]
  const stageList = Array.isArray(raw.funnelStages)
    ? base.funnelStages.map((stage, index) => {
        const candidate = raw.funnelStages?.[index]
        return { ...stage, label: isRecord(candidate) && typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label.trim() : stage.label }
      })
    : base.funnelStages
  return {
    ...base,
    catalog: Array.isArray(raw.catalog) ? raw.catalog as CatalogItem[] : base.catalog,
    officialRules: mergeRules(base.officialRules, raw.officialRules),
    demoRules: mergeRules(base.demoRules, raw.demoRules),
    paymentMethods: Array.isArray(raw.paymentMethods) ? raw.paymentMethods as PaymentMethod[] : base.paymentMethods,
    company: { ...base.company, ...(isRecord(raw.company) ? raw.company : {}) } as CompanySettings,
    leadSources: stringList(raw.leadSources, base.leadSources),
    regions: stringList(raw.regions, base.regions),
    funnelStages: stageList,
    lossReasons: stringList(raw.lossReasons, base.lossReasons),
    clientTypes: stringList(raw.clientTypes, base.clientTypes),
    elementTypes: stringList(raw.elementTypes, base.elementTypes),
  }
}

function hasDuplicates(values: string[]): boolean {
  const normalized = values.map((value) => value.trim().toLocaleLowerCase('pt-BR'))
  return new Set(normalized).size !== normalized.length
}

export function validateSettings(value: AppSettings): AppSettings {
  const listInputs = [value.leadSources, value.regions, value.lossReasons, value.clientTypes, value.elementTypes]
  if (listInputs.some((list) => !Array.isArray(list) || list.some((item) => typeof item !== 'string' || !item.trim()))) {
    throw new Error('Os cadastros de apoio não podem conter nomes vazios.')
  }
  if (listInputs.some((list) => hasDuplicates(list))) {
    throw new Error('Remova os nomes repetidos das listas de apoio antes de confirmar.')
  }
  const next = normalizeSettings(value)
  if (!next.company.tradeName.trim()) throw new Error('Informe o nome comercial da empresa.')
  if (next.catalog.some((item) => !item.id.trim() || !item.code.trim() || !item.name.trim())) throw new Error('Cada produto precisa ter código e nome.')
  if (hasDuplicates(next.catalog.map((item) => item.code))) throw new Error('Existem códigos repetidos no catálogo.')
  if (next.paymentMethods.some((method) => !method.id.trim() || !method.label.trim())) throw new Error('Cada forma de pagamento precisa ter um nome.')
  if (hasDuplicates(next.leadSources) || hasDuplicates(next.regions) || hasDuplicates(next.lossReasons) || hasDuplicates(next.clientTypes) || hasDuplicates(next.elementTypes)) {
    throw new Error('Remova os nomes repetidos das listas de apoio antes de confirmar.')
  }
  if (next.leadSources[0] !== 'Não informado') {
    throw new Error('A origem "Não informado" precisa permanecer como a primeira opção do funil.')
  }
  if (next.funnelStages.some((stage) => !stage.label.trim())) {
    throw new Error('Todas as etapas do funil precisam ter um rótulo.')
  }
  if (next.paymentMethods.some((method) => method.enabledOfficial !== null && typeof method.enabledOfficial !== 'boolean')) {
    throw new Error('O status de cada forma de pagamento deve ser aceita, não aceita ou a confirmar.')
  }
  if (next.officialRules.maxDiscountPctWithoutApproval !== null &&
      (!Number.isFinite(next.officialRules.maxDiscountPctWithoutApproval) ||
        next.officialRules.maxDiscountPctWithoutApproval < 0 || next.officialRules.maxDiscountPctWithoutApproval > 100)) {
    throw new Error('O desconto sem aprovação deve estar entre 0 e 100%.')
  }
  if (typeof next.officialRules.minVolume.chargeDifference !== 'boolean') {
    throw new Error('Informe se a diferença até o volume mínimo deve ser cobrada.')
  }
  if (next.officialRules.validityDays !== null &&
      (!Number.isInteger(next.officialRules.validityDays) || next.officialRules.validityDays < 1 || next.officialRules.validityDays > 365)) {
    throw new Error('A validade padrão deve ser um número inteiro entre 1 e 365 dias.')
  }
  if (!Number.isInteger(next.officialRules.quantityDecimals) || next.officialRules.quantityDecimals < 0 || next.officialRules.quantityDecimals > 4) {
    throw new Error('As casas decimais de quantidade devem estar entre 0 e 4.')
  }
  if (next.officialRules.freight.regions.some((region) => !next.regions.includes(region.name))) {
    throw new Error('Os nomes das regiões de frete precisam corresponder aos cadastros de regiões.')
  }
  if (!Number.isInteger(next.demoRules.quantityDecimals) || next.demoRules.quantityDecimals < 0 || next.demoRules.quantityDecimals > 4) {
    throw new Error('As casas decimais de demonstração devem estar entre 0 e 4.')
  }
  const prices = [
    ...next.catalog.flatMap((item) => [item.basePrice, item.demoPrice]),
    next.officialRules.freight.fixed, next.officialRules.freight.perKm,
    next.demoRules.freight.fixed, next.demoRules.freight.perKm,
    next.officialRules.pumping.fixed, next.officialRules.pumping.perM3, next.officialRules.pumping.perHour, next.officialRules.pumping.minimum,
    next.demoRules.pumping.fixed, next.demoRules.pumping.perM3, next.demoRules.pumping.perHour, next.demoRules.pumping.minimum,
    next.officialRules.minVolume.m3, next.officialRules.minVolume.minOrderValue, next.demoRules.minVolume.m3, next.demoRules.minVolume.minOrderValue,
    next.officialRules.stay.toleranceMin, next.officialRules.stay.perHour, next.demoRules.stay.toleranceMin, next.demoRules.stay.perHour,
    next.officialRules.floor.minArea, next.demoRules.floor.minArea,
    ...next.officialRules.freight.regions.map((region) => region.price),
    ...next.demoRules.freight.regions.map((region) => region.price),
  ]
  if (prices.some((price) => price !== null && (!Number.isFinite(price) || price < 0))) throw new Error('Preços, prazos e limites não podem ser negativos ou inválidos.')
  return next
}
