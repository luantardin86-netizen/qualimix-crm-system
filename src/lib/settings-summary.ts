import type { AppSettings } from '../data/settings'

/** Itens que ainda precisam ser confirmados pela empresa, usando o snapshot atual do Store. */
export function pendingSettings(settings: AppSettings): string[] {
  const pending: string[] = []
  const missingPrices = settings.catalog.filter((item) => item.basePrice === null).length
  if (missingPrices) pending.push(String(missingPrices) + ' preços do catálogo')
  if (!settings.company.cnpj || !settings.company.legalName || !settings.company.address) {
    pending.push('Dados institucionais (razão social, CNPJ e endereço)')
  }
  if (settings.officialRules.freight.fixed === null &&
      settings.officialRules.freight.perKm === null &&
      settings.officialRules.freight.regions.every((region) => region.price === null)) {
    pending.push('Regras de frete')
  }
  if (settings.officialRules.pumping.fixed === null &&
      settings.officialRules.pumping.perM3 === null &&
      settings.officialRules.pumping.perHour === null) {
    pending.push('Regras de bombeamento')
  }
  if (settings.officialRules.minVolume.m3 === null) pending.push('Volume mínimo')
  if (settings.officialRules.stay.perHour === null) pending.push('Regras de estadia')
  if (settings.paymentMethods.every((method) => method.enabledOfficial === null)) {
    pending.push('Formas de pagamento aceitas')
  }
  if (settings.officialRules.validityDays === null) pending.push('Validade padrão das propostas')
  return pending
}
