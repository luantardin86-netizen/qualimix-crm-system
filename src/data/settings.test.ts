import { describe, expect, it } from 'vitest'
import { createDefaultSettings, normalizeSettings, pendingSettings, validateSettings } from './settings'

describe('app settings', () => {
  it('creates an independent copy of default settings', () => {
    const first = createDefaultSettings()
    const second = createDefaultSettings()
    first.company.tradeName = 'Outra marca'
    first.catalog[0].basePrice = 123
    expect(second.company.tradeName).toBe('Qualimix')
    expect(second.catalog[0].basePrice).toBeNull()
  })

  it('preserves defaults when stored settings are incomplete', () => {
    const restored = normalizeSettings({ company: { tradeName: 'Empresa teste' }, officialRules: { freight: { fixed: 100 } } })
    expect(restored.company.tradeName).toBe('Empresa teste')
    expect(restored.company.email).toBeNull()
    expect(restored.officialRules.freight.fixed).toBe(100)
    expect(restored.officialRules.freight.perKm).toBeNull()
    expect(restored.catalog.length).toBeGreaterThan(0)
  })

  it('reports pending values using the saved settings, not static defaults', () => {
    const configured = createDefaultSettings()
    configured.catalog.forEach((item) => { item.basePrice = 100 })
    configured.company.legalName = 'Empresa Ltda.'
    configured.company.cnpj = '00000000000000'
    configured.company.address = 'Endereço informado'
    configured.officialRules.freight.fixed = 50
    configured.officialRules.pumping.fixed = 80
    configured.officialRules.minVolume.m3 = 1
    configured.officialRules.stay.perHour = 20
    configured.officialRules.validityDays = 7
    configured.paymentMethods[0].enabledOfficial = true
    expect(pendingSettings(configured)).toEqual([])
  })

  it('validates commercial limits and keeps missing numbers as null', () => {
    const configured = createDefaultSettings()
    configured.officialRules.freight.fixed = null
    configured.officialRules.maxDiscountPctWithoutApproval = 100
    configured.officialRules.validityDays = 365
    configured.officialRules.quantityDecimals = 0
    expect(validateSettings(configured).officialRules.freight.fixed).toBeNull()

    configured.officialRules.maxDiscountPctWithoutApproval = 100.1
    expect(() => validateSettings(configured)).toThrow(/desconto sem aprovação/i)
    configured.officialRules.maxDiscountPctWithoutApproval = 5
    configured.officialRules.validityDays = 366
    expect(() => validateSettings(configured)).toThrow(/validade padrão/i)
    configured.officialRules.validityDays = 15
    configured.officialRules.quantityDecimals = 5
    expect(() => validateSettings(configured)).toThrow(/casas decimais/i)
  })

  it('protects the default lead source and rejects empty or duplicated support entries', () => {
    const configured = createDefaultSettings()
    configured.leadSources = ['WhatsApp', 'Não informado']
    expect(() => validateSettings(configured)).toThrow(/primeira origem/i)

    configured.leadSources = ['Não informado', 'WhatsApp', 'WhatsApp']
    expect(() => validateSettings(configured)).toThrow(/nomes repetidos/i)

    configured.leadSources = ['Não informado', '']
    expect(() => validateSettings(configured)).toThrow(/itens preenchidas/i)
  })

  it('requires fixed funnel stage ids, non-empty labels and synchronized freight regions', () => {
    const configured = createDefaultSettings()
    configured.funnelStages[0].label = ' '
    expect(() => validateSettings(configured)).toThrow(/ids fixos/i)

    configured.funnelStages[0].label = 'Novo contato'
    configured.officialRules.freight.regions[0].name = 'Outra região'
    expect(() => validateSettings(configured)).toThrow(/sincronizadas/i)
  })

  it('rejects duplicate catalog codes and empty business names', () => {
    const configured = createDefaultSettings()
    configured.catalog[1].code = configured.catalog[0].code
    expect(() => validateSettings(configured)).toThrow(/códigos repetidos/i)
    configured.catalog[1].code = 'CON-25'
    configured.company.tradeName = ' '
    expect(() => validateSettings(configured)).toThrow(/nome comercial/i)
  })
})
