import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { AppSettings, PaymentMethod } from '../data/settings'
import type { CommercialRules } from '../lib/quote'
import { brl, num, parseDecimal } from '../lib/format'
import { Badge, Button, Card, CardHeader, cx, inputCls } from './ui'

type RuleKey =
  | 'freight.fixed'
  | 'freight.perKm'
  | 'pumping.fixed'
  | 'pumping.perM3'
  | 'pumping.perHour'
  | 'pumping.minimum'
  | 'minVolume.m3'
  | 'minVolume.minOrderValue'
  | 'stay.toleranceMin'
  | 'stay.perHour'
  | 'floor.minArea'
  | 'maxDiscountPctWithoutApproval'
  | 'validityDays'
  | 'quantityDecimals'

type RegionDraft = { id: string; name: string; price: string }
type PaymentDraft = { id: string; label: string; enabledOfficial: 'pending' | 'accepted' | 'rejected' }

type BusinessDraft = {
  rules: Record<RuleKey, string>
  chargeDifference: boolean
  regions: RegionDraft[]
  paymentMethods: PaymentDraft[]
  leadSources: string[]
  lossReasons: string[]
  clientTypes: string[]
  elementTypes: string[]
  funnelStages: AppSettings['funnelStages']
}

const ruleLabels: Record<RuleKey, string> = {
  'freight.fixed': 'Frete — valor fixo',
  'freight.perKm': 'Frete — por km',
  'pumping.fixed': 'Bombeamento — fixo',
  'pumping.perM3': 'Bombeamento — por m³',
  'pumping.perHour': 'Bombeamento — por hora',
  'pumping.minimum': 'Bombeamento — mínimo',
  'minVolume.m3': 'Volume mínimo (m³)',
  'minVolume.minOrderValue': 'Valor mínimo do pedido',
  'stay.toleranceMin': 'Tolerância de estadia (min)',
  'stay.perHour': 'Estadia — por hora',
  'floor.minArea': 'Piso — área mínima (m²)',
  maxDiscountPctWithoutApproval: 'Desconto sem aprovação (%)',
  validityDays: 'Validade padrão (dias)',
  quantityDecimals: 'Casas decimais de quantidade',
}

const raw = (value: number | null) => value === null ? '' : String(value)

function toDraft(settings: AppSettings): BusinessDraft {
  return {
    rules: {
      'freight.fixed': raw(settings.officialRules.freight.fixed),
      'freight.perKm': raw(settings.officialRules.freight.perKm),
      'pumping.fixed': raw(settings.officialRules.pumping.fixed),
      'pumping.perM3': raw(settings.officialRules.pumping.perM3),
      'pumping.perHour': raw(settings.officialRules.pumping.perHour),
      'pumping.minimum': raw(settings.officialRules.pumping.minimum),
      'minVolume.m3': raw(settings.officialRules.minVolume.m3),
      'minVolume.minOrderValue': raw(settings.officialRules.minVolume.minOrderValue),
      'stay.toleranceMin': raw(settings.officialRules.stay.toleranceMin),
      'stay.perHour': raw(settings.officialRules.stay.perHour),
      'floor.minArea': raw(settings.officialRules.floor.minArea),
      maxDiscountPctWithoutApproval: raw(settings.officialRules.maxDiscountPctWithoutApproval),
      validityDays: raw(settings.officialRules.validityDays),
      quantityDecimals: String(settings.officialRules.quantityDecimals),
    },
    chargeDifference: settings.officialRules.minVolume.chargeDifference,
    regions: settings.regions.map((name, index) => {
      const matching = settings.officialRules.freight.regions.find((region) => region.name === name)
        ?? settings.officialRules.freight.regions[index]
      return {
        id: matching?.id ?? 'region-' + index,
        name,
        price: raw(matching?.price ?? null),
      }
    }),
    paymentMethods: settings.paymentMethods.map((method) => ({
      id: method.id,
      label: method.label,
      enabledOfficial: method.enabledOfficial === null ? 'pending' : method.enabledOfficial ? 'accepted' : 'rejected',
    })),
    leadSources: [...settings.leadSources],
    lossReasons: [...settings.lossReasons],
    clientTypes: [...settings.clientTypes],
    elementTypes: [...settings.elementTypes],
    funnelStages: settings.funnelStages.map((stage) => ({ ...stage })),
  }
}

function parseRuleValue(key: RuleKey, value: string): { value: number | null; error: string | null } {
  const parsed = parseDecimal(value)
  if (!parsed.ok) return { value: null, error: 'Informe um número válido.' }
  const number = parsed.value
  if (key === 'quantityDecimals') {
    if (number === null || !Number.isInteger(number) || number < 0 || number > 4) {
      return { value: null, error: 'Informe um número inteiro entre 0 e 4.' }
    }
    return { value: number, error: null }
  }
  if (number !== null && number < 0) return { value: null, error: 'O valor não pode ser negativo.' }
  if (key === 'maxDiscountPctWithoutApproval' && number !== null && number > 100) {
    return { value: null, error: 'O desconto deve ficar entre 0% e 100%.' }
  }
  if (key === 'validityDays' && number !== null && (!Number.isInteger(number) || number < 1 || number > 365)) {
    return { value: null, error: 'A validade deve ser um número inteiro entre 1 e 365 dias.' }
  }
  return { value: number, error: null }
}

function parsePrice(value: string): { value: number | null; error: string | null } {
  const parsed = parseDecimal(value)
  if (!parsed.ok) return { value: null, error: 'Informe um valor numérico válido.' }
  if (parsed.value !== null && parsed.value < 0) return { value: null, error: 'O valor não pode ser negativo.' }
  return { value: parsed.value, error: null }
}

function listError(items: string[], protectedFirst = false): string | null {
  if (!items.length || items.some((item) => !item.trim())) return 'A lista precisa ter opções preenchidas.'
  const normalized = items.map((item) => item.trim().toLocaleLowerCase('pt-BR'))
  if (new Set(normalized).size !== normalized.length) return 'Existem itens duplicados nesta lista.'
  if (protectedFirst && (items[0] !== 'Não informado' || items.filter((item) => item === 'Não informado').length !== 1)) {
    return '"Não informado" deve continuar na primeira posição.'
  }
  return null
}

function valueDisplay(value: number | null, formatter: (n: number) => string = brl) {
  return value === null ? <Badge tone="warn">Pendente</Badge> : <span className="tabular">{formatter(value)}</span>
}

function RuleInput({
  label,
  value,
  onChange,
  error,
  integer = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string | null
  integer?: boolean
}) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="mb-1 block text-[13px] font-semibold text-ink-2">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={integer ? 'numeric' : 'decimal'}
        placeholder="Pendente"
        aria-invalid={Boolean(error)}
        className={cx(inputCls(Boolean(error)), 'tabular')}
      />
      {error
        ? <span className="mt-1 block text-xs font-medium text-brand" role="alert">{error}</span>
        : !value.trim() && <span className="mt-1 block"><Badge tone="warn">Pendente</Badge></span>}
    </label>
  )
}

function StringListEditor({
  title,
  hint,
  items,
  onChange,
  protectedFirst = false,
  isAdmin,
}: {
  title: string
  hint?: string
  items: string[]
  onChange: (items: string[]) => void
  protectedFirst?: boolean
  isAdmin: boolean
}) {
  const error = listError(items, protectedFirst)
  const change = (index: number, value: string) => onChange(items.map((item, i) => i === index ? value : item))
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length || (protectedFirst && target === 0)) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <section className="rounded-md border border-line p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
        {isAdmin && (
          <Button size="sm" type="button" onClick={() => onChange([...items, ''])}>
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        )}
      </div>
      {isAdmin ? (
        <div className="space-y-2">
          {items.map((item, index) => {
            const protectedItem = protectedFirst && index === 0 && item === 'Não informado'
            const duplicate = item.trim() && items.some((candidate, i) => i !== index && candidate.trim().toLocaleLowerCase('pt-BR') === item.trim().toLocaleLowerCase('pt-BR'))
            return (
              <div key={title + ':' + index} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    value={item}
                    disabled={protectedItem}
                    onChange={(event) => change(index, event.target.value)}
                    aria-label={title + ', item ' + (index + 1)}
                    className={inputCls(!item.trim() || Boolean(duplicate))}
                  />
                  {!item.trim()
                    ? <p className="mt-1 text-xs text-brand" role="alert">Preencha este item.</p>
                    : duplicate ? <p className="mt-1 text-xs text-brand" role="alert">Este item está duplicado.</p> : null}
                  {protectedItem && <p className="mt-1 text-xs text-muted">Item protegido: usado como origem padrão do funil.</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" type="button" variant="secondary" aria-label={'Mover ' + item + ' para cima'} disabled={index === 0 || protectedFirst && index === 1} onClick={() => move(index, -1)}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" type="button" variant="secondary" aria-label={'Mover ' + item + ' para baixo'} disabled={index === items.length - 1 || protectedItem} onClick={() => move(index, 1)}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" type="button" variant="danger" aria-label={'Remover ' + item} disabled={protectedItem || items.length <= 1} onClick={() => onChange(items.filter((_, i) => i !== index))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
          {error && <p className="text-xs text-brand" role="alert">{error}</p>}
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item, index) => <li key={title + ':' + index}><Badge>{item}</Badge></li>)}
        </ul>
      )}
    </section>
  )
}

export function CommercialSettingsEditor({
  settings,
  isAdmin,
  onSave,
  onDirtyChange,
  onToast,
}: {
  settings: AppSettings
  isAdmin: boolean
  onSave: (settings: AppSettings) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  onToast: (title: string, body: string) => void
}) {
  const [draft, setDraft] = useState<BusinessDraft>(() => toDraft(settings))
  const [savedDraft, setSavedDraft] = useState<BusinessDraft>(() => toDraft(settings))
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft)

  useEffect(() => {
    if (!dirty) {
      const next = toDraft(settings)
      setDraft(next)
      setSavedDraft(next)
    }
  }, [settings, dirty])

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  const ruleErrors = Object.fromEntries(
    (Object.keys(ruleLabels) as RuleKey[]).map((key) => [key, parseRuleValue(key, draft.rules[key]).error]),
  ) as Record<RuleKey, string | null>
  const priceErrors = Object.fromEntries(draft.regions.map((region) => [region.id, parsePrice(region.price).error])) as Record<string, string | null>
  const supportErrors = {
    leadSources: listError(draft.leadSources, true),
    lossReasons: listError(draft.lossReasons),
    clientTypes: listError(draft.clientTypes),
    elementTypes: listError(draft.elementTypes),
    regions: listError(draft.regions.map((region) => region.name)),
  }
  const stageErrors = draft.funnelStages.some((stage) => !stage.label.trim())
  const hasErrors = Object.values(ruleErrors).some(Boolean)
    || Object.values(priceErrors).some(Boolean)
    || Object.values(supportErrors).some(Boolean)
    || stageErrors

  const updateRule = (key: RuleKey, value: string) => {
    setDraft((current) => ({ ...current, rules: { ...current.rules, [key]: value } }))
  }

  const updateRegion = (id: string, patch: Partial<RegionDraft>) => {
    setDraft((current) => ({
      ...current,
      regions: current.regions.map((region) => region.id === id ? { ...region, ...patch } : region),
    }))
  }

  const moveRegion = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= draft.regions.length) return
    setDraft((current) => {
      const regions = [...current.regions]
      ;[regions[index], regions[target]] = [regions[target], regions[index]]
      return { ...current, regions }
    })
  }

  const updatePayment = (id: string, value: PaymentDraft['enabledOfficial']) => {
    setDraft((current) => ({
      ...current,
      paymentMethods: current.paymentMethods.map((method) => method.id === id ? { ...method, enabledOfficial: value } : method),
    }))
  }

  const updateList = (key: 'leadSources' | 'lossReasons' | 'clientTypes' | 'elementTypes', items: string[]) => {
    setDraft((current) => ({ ...current, [key]: items }))
  }

  const updateStageLabel = (id: string, label: string) => {
    setDraft((current) => ({
      ...current,
      funnelStages: current.funnelStages.map((stage) => stage.id === id ? { ...stage, label } : stage),
    }))
  }

  const discard = () => setDraft(savedDraft)

  const buildSettings = (): AppSettings => {
    const parsed = Object.fromEntries(
      (Object.keys(ruleLabels) as RuleKey[]).map((key) => [key, parseRuleValue(key, draft.rules[key]).value]),
    ) as Record<RuleKey, number | null>
    const regionRules = draft.regions.map((region) => ({
      id: region.id,
      name: region.name.trim(),
      price: parsePrice(region.price).value,
    }))
    const officialRules: CommercialRules = {
      ...settings.officialRules,
      freight: {
        ...settings.officialRules.freight,
        fixed: parsed['freight.fixed'],
        perKm: parsed['freight.perKm'],
        regions: regionRules,
      },
      pumping: {
        fixed: parsed['pumping.fixed'],
        perM3: parsed['pumping.perM3'],
        perHour: parsed['pumping.perHour'],
        minimum: parsed['pumping.minimum'],
      },
      minVolume: {
        m3: parsed['minVolume.m3'],
        chargeDifference: draft.chargeDifference,
        minOrderValue: parsed['minVolume.minOrderValue'],
      },
      stay: {
        toleranceMin: parsed['stay.toleranceMin'],
        perHour: parsed['stay.perHour'],
      },
      floor: { minArea: parsed['floor.minArea'] },
      maxDiscountPctWithoutApproval: parsed.maxDiscountPctWithoutApproval,
      validityDays: parsed.validityDays,
      quantityDecimals: parsed.quantityDecimals ?? 2,
    }
    const paymentMethods: PaymentMethod[] = draft.paymentMethods.map((method) => ({
      ...settings.paymentMethods.find((saved) => saved.id === method.id)!,
      enabledOfficial: method.enabledOfficial === 'pending' ? null : method.enabledOfficial === 'accepted',
    }))
    return {
      ...settings,
      officialRules,
      paymentMethods,
      leadSources: draft.leadSources.map((item) => item.trim()),
      regions: draft.regions.map((region) => region.name.trim()),
      lossReasons: draft.lossReasons.map((item) => item.trim()),
      clientTypes: draft.clientTypes.map((item) => item.trim()),
      elementTypes: draft.elementTypes.map((item) => item.trim()),
      funnelStages: draft.funnelStages.map((stage) => ({ ...stage, label: stage.label.trim() })),
    }
  }

  const save = async () => {
    if (!dirty || hasErrors) return
    setSaving(true)
    try {
      await onSave(buildSettings())
      setSavedDraft(draft)
    } catch (error) {
      onToast('Não foi possível salvar as configurações comerciais', error instanceof Error ? error.message : 'Erro ao salvar as configurações.')
    } finally {
      setSaving(false)
    }
  }

  const demo = settings.demoRules


  const numericField = (key: RuleKey, label = ruleLabels[key], formatter?: (n: number) => string) => (
    <div key={key} className="min-w-0">
      {isAdmin ? (
        <RuleInput
          label={label}
          value={draft.rules[key]}
          onChange={(value) => updateRule(key, value)}
          error={ruleErrors[key]}
          integer={key === 'validityDays' || key === 'quantityDecimals'}
        />
      ) : (
        <div>
          <p className="mb-1 text-[13px] font-semibold text-ink-2">{label}</p>
          {valueDisplay(
            key === 'freight.fixed' ? settings.officialRules.freight.fixed
              : key === 'freight.perKm' ? settings.officialRules.freight.perKm
              : key === 'pumping.fixed' ? settings.officialRules.pumping.fixed
              : key === 'pumping.perM3' ? settings.officialRules.pumping.perM3
              : key === 'pumping.perHour' ? settings.officialRules.pumping.perHour
              : key === 'pumping.minimum' ? settings.officialRules.pumping.minimum
              : key === 'minVolume.m3' ? settings.officialRules.minVolume.m3
              : key === 'minVolume.minOrderValue' ? settings.officialRules.minVolume.minOrderValue
              : key === 'stay.toleranceMin' ? settings.officialRules.stay.toleranceMin
              : key === 'stay.perHour' ? settings.officialRules.stay.perHour
              : key === 'floor.minArea' ? settings.officialRules.floor.minArea
              : key === 'maxDiscountPctWithoutApproval' ? settings.officialRules.maxDiscountPctWithoutApproval
              : key === 'validityDays' ? settings.officialRules.validityDays
              : settings.officialRules.quantityDecimals,
            formatter ?? (key === 'maxDiscountPctWithoutApproval' ? (n) => n + '%' : key === 'validityDays' ? (n) => n + ' dias' : key === 'quantityDecimals' ? (n) => String(n) : brl),
          )}
        </div>
      )}
    </div>
  )

  const renderRegion = (region: RegionDraft, index: number) => {
    const demoPrice = demo.freight.regions.find((item) => item.id === region.id)?.price ?? null
    return (
      <tr key={region.id} className="border-b border-line last:border-0">
        <td className="px-3 py-3">
          {isAdmin ? (
            <>
              <input
                value={region.name}
                onChange={(event) => updateRegion(region.id, { name: event.target.value })}
                aria-label={'Nome da região ' + (index + 1)}
                placeholder="Nome da região"
                className={inputCls(!region.name.trim())}
              />
              {!region.name.trim() && <p className="mt-1 text-xs text-brand" role="alert">Informe o nome da região.</p>}
            </>
          ) : region.name}
        </td>
        <td className="px-3 py-3 text-right">
          {isAdmin ? (
            <>
              <input
                value={region.price}
                inputMode="decimal"
                onChange={(event) => updateRegion(region.id, { price: event.target.value })}
                aria-label={'Frete da região ' + region.name}
                placeholder="Pendente"
                className={cx(inputCls(Boolean(priceErrors[region.id])), 'w-36 text-right tabular')}
              />
              {priceErrors[region.id] && <p className="mt-1 text-xs text-brand" role="alert">{priceErrors[region.id]}</p>}
              {!region.price.trim() && <div className="mt-1 text-left"><Badge tone="warn">Pendente</Badge></div>}
            </>
          ) : valueDisplay(settings.officialRules.freight.regions.find((item) => item.id === region.id)?.price ?? null)}
        </td>
        <td className="px-3 py-3 text-right text-muted">{valueDisplay(demoPrice)}</td>
        {isAdmin && (
          <td className="px-3 py-3">
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" aria-label="Mover região para cima" disabled={index === 0} onClick={() => moveRegion(index, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="secondary" aria-label="Mover região para baixo" disabled={index === draft.regions.length - 1} onClick={() => moveRegion(index, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="danger" aria-label={'Remover região ' + region.name} disabled={draft.regions.length <= 1} onClick={() => setDraft((current) => ({ ...current, regions: current.regions.filter((item) => item.id !== region.id) }))}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </td>
        )}
      </tr>
    )
  }

  return (
    <div className="mb-6 space-y-6">
      <Card>
        <CardHeader
          title="Regras comerciais oficiais"
          subtitle={isAdmin ? 'Valores vazios permanecem pendentes. Preencha somente os valores confirmados pela Qualimix.' : 'Regras oficiais cadastradas. Valores ausentes permanecem pendentes.'}
          action={isAdmin && dirty ? <Badge tone="warn">Alterações não salvas</Badge> : undefined}
        />
        <div className="p-5">
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {numericField('freight.fixed')}
            {numericField('freight.perKm')}
            {numericField('pumping.fixed')}
            {numericField('pumping.perM3')}
            {numericField('pumping.perHour')}
            {numericField('pumping.minimum')}
            {numericField('minVolume.m3')}
            {numericField('minVolume.minOrderValue')}
            {numericField('stay.toleranceMin', ruleLabels['stay.toleranceMin'], (n) => num(n, 0) + ' min')}
            {numericField('stay.perHour')}
            {numericField('floor.minArea', ruleLabels['floor.minArea'], (n) => num(n, 0) + ' m²')}
            {numericField('maxDiscountPctWithoutApproval')}
            {numericField('validityDays')}
            {numericField('quantityDecimals')}
          </div>
          <div className="mb-6 rounded-md border border-line p-4">
            <label className={cx('flex items-start gap-3 text-sm', !isAdmin && 'text-muted')}>
              <input
                type="checkbox"
                className="mt-0.5 accent-[var(--brand)]"
                checked={isAdmin ? draft.chargeDifference : settings.officialRules.minVolume.chargeDifference}
                disabled={!isAdmin}
                onChange={(event) => setDraft((current) => ({ ...current, chargeDifference: event.target.checked }))}
              />
              <span>
                <strong className="block text-ink">Cobrar a diferença até o volume mínimo</strong>
                <span className="text-xs text-muted">Quando ativado, o complemento de volume abaixo do mínimo entra no orçamento.</span>
              </span>
            </label>
          </div>

          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-3">Frete por região</th>
                  <th className="px-3 py-3 text-right">Oficial</th>
                  <th className="px-3 py-3 text-right">Demonstração</th>
                  {isAdmin && <th className="px-3 py-3">Ordem / ações</th>}
                </tr>
              </thead>
              <tbody>
                {draft.regions.map(renderRegion)}
                {!draft.regions.length && <tr><td colSpan={isAdmin ? 4 : 3} className="p-4 text-center text-sm text-muted">Adicione pelo menos uma região.</td></tr>}
              </tbody>
            </table>
            {isAdmin && (
              <div className="border-t border-line p-3">
                <Button size="sm" type="button" onClick={() => setDraft((current) => ({
                  ...current,
                  regions: [...current.regions, { id: 'region-' + Date.now().toString(36), name: '', price: '' }],
                }))}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar região
                </Button>
                {supportErrors.regions && <p className="mt-2 text-xs text-brand" role="alert">{supportErrors.regions}</p>}
                <p className="mt-1 text-xs text-muted">Renomear uma região também atualiza seu nome na regra de frete. Regiões já usadas em registros não podem ser removidas ou renomeadas.</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Formas de pagamento" subtitle="Somente as opções marcadas como aceita ficam disponíveis nos orçamentos." />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {draft.paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between gap-3 rounded-md border border-line p-3">
              <div>
                <p className="font-semibold">{method.label}</p>
                {!isAdmin && (
                  <p className="text-xs text-muted">
                    {method.enabledOfficial === 'pending' ? 'A confirmar' : method.enabledOfficial === 'accepted' ? 'Aceita' : 'Não aceita'}
                  </p>
                )}
              </div>
              {isAdmin ? (
                <select
                  value={method.enabledOfficial}
                  onChange={(event) => updatePayment(method.id, event.target.value as PaymentDraft['enabledOfficial'])}
                  aria-label={'Situação da forma de pagamento ' + method.label}
                  className={cx(inputCls(), 'h-9 w-36 text-sm')}
                >
                  <option value="pending">A confirmar</option>
                  <option value="accepted">Aceita</option>
                  <option value="rejected">Não aceita</option>
                </select>
              ) : (
                <Badge tone={method.enabledOfficial === 'accepted' ? 'ok' : 'warn'}>
                  {method.enabledOfficial === 'pending' ? 'A confirmar' : method.enabledOfficial === 'accepted' ? 'Aceita' : 'Não aceita'}
                </Badge>
              )}
            </div>
          ))}
        </div>
        {isAdmin && <p className="px-5 pb-4 text-xs text-muted">As três situações são preservadas: aceita, não aceita e a confirmar (null).</p>}
      </Card>

      <Card>
        <CardHeader title="Cadastros de apoio" subtitle="Organize as opções usadas no cadastro de clientes, funil, obras e calculadoras. Opções em uso não podem ser removidas ou renomeadas." />
        <div className="grid gap-4 p-5 xl:grid-cols-2">
          <StringListEditor
            title="Origens de lead"
            hint={'"Não informado" é a opção padrão do funil e fica protegida na primeira posição.'}
            items={draft.leadSources}
            onChange={(items) => updateList('leadSources', items)}
            protectedFirst
            isAdmin={isAdmin}
          />
          <StringListEditor
            title="Motivos de perda"
            items={draft.lossReasons}
            onChange={(items) => updateList('lossReasons', items)}
            isAdmin={isAdmin}
          />
          <StringListEditor
            title="Tipos de cliente"
            items={draft.clientTypes}
            onChange={(items) => updateList('clientTypes', items)}
            isAdmin={isAdmin}
          />
          <StringListEditor
            title="Tipos de elemento"
            hint="Usados nas calculadoras de volume e área."
            items={draft.elementTypes}
            onChange={(items) => updateList('elementTypes', items)}
            isAdmin={isAdmin}
          />
          {isAdmin && (
            <div className="xl:col-span-2 space-y-1">
              {Object.values(supportErrors).filter(Boolean).map((error) => <p key={error} className="text-xs text-brand" role="alert">{error}</p>)}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Etapas do funil" subtitle="Os identificadores internos são fixos para preservar oportunidades e histórico. Apenas os rótulos podem ser alterados." />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {draft.funnelStages.map((stage) => (
            <label key={stage.id} className="block text-sm">
              <span className="mb-1 block text-xs font-mono text-muted">{stage.id}</span>
              {isAdmin ? (
                <input
                  value={stage.label}
                  onChange={(event) => updateStageLabel(stage.id, event.target.value)}
                  aria-label={'Rótulo da etapa ' + stage.id}
                  className={inputCls(!stage.label.trim())}
                />
              ) : <span className="font-semibold">{stage.label}</span>}
              {!stage.label.trim() && <p className="mt-1 text-xs text-brand" role="alert">Informe um rótulo.</p>}
            </label>
          ))}
        </div>
      </Card>

      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-4">
          <div className="text-sm">
            {dirty
              ? <><Badge tone="warn">Alterações não salvas</Badge><p className="mt-1 text-xs text-muted">Regras, pagamentos, cadastros e rótulos são salvos juntos.</p></>
              : <span className="text-muted">Configurações comerciais sincronizadas.</span>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={!dirty || saving} onClick={discard}>Descartar</Button>
            <Button type="button" variant="primary" disabled={!dirty || hasErrors || saving} onClick={() => void save()}>
              {saving ? 'Salvando…' : 'Salvar configurações comerciais'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
