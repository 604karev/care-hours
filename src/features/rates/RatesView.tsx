import { useState, type FormEvent } from 'react'
import { formatMoney } from '../workspace/date'
import { Modal } from '../workspace/Modal'
import type { RateUnit, ServiceType } from '../workspace/types'

export interface ServiceTypeInput {
  name: string
  code: string
  background_color: string
  text_color: string
  rate_unit: RateUnit
  rate_amount: number
}

const palette = ['#8FC47C', '#FFE34F', '#EC8E8E', '#8CB9E8', '#C7A7E8', '#F2AE68']

function readableText(background: string) {
  const hex = background.replace('#', '')
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return red * 0.299 + green * 0.587 + blue * 0.114 > 160 ? '#17211A' : '#FFFFFF'
}

function RateForm({
  serviceType,
  onClose,
  onSave,
}: {
  serviceType: ServiceType | null
  onClose: () => void
  onSave: (value: ServiceTypeInput) => Promise<void>
}) {
  const [name, setName] = useState(serviceType?.name ?? '')
  const [code, setCode] = useState(serviceType?.code ?? '')
  const [color, setColor] = useState(serviceType?.background_color ?? palette[0])
  const [rateUnit, setRateUnit] = useState<RateUnit>(serviceType?.rate_unit ?? 'hourly')
  const [amount, setAmount] = useState(String(serviceType?.rate_amount ?? ''))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        background_color: color,
        text_color: readableText(color),
        rate_unit: rateUnit,
        rate_amount: Number(amount),
      })
      onClose()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Не удалось сохранить тариф')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={serviceType ? 'Редактировать тариф' : 'Новый тариф'} onClose={onClose}>
      <form className="entity-form" onSubmit={submit}>
        <label className="field">
          Название
          <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          Короткий код
          <input required maxLength={16} placeholder="ОБЫЧ" value={code} onChange={(event) => setCode(event.target.value)} />
        </label>
        <fieldset className="color-field wide-field">
          <legend>Цвет в табеле</legend>
          <div className="palette-row">
            {palette.map((item) => (
              <button
                aria-label={`Выбрать цвет ${item}`}
                className={item === color ? 'palette-dot selected' : 'palette-dot'}
                key={item}
                style={{ background: item }}
                type="button"
                onClick={() => setColor(item)}
              />
            ))}
            <input aria-label="Свой цвет" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </div>
        </fieldset>
        <label className="field">
          Способ расчёта
          <select value={rateUnit} onChange={(event) => setRateUnit(event.target.value as RateUnit)}>
            <option value="hourly">За час</option>
            <option value="per_visit">За визит</option>
          </select>
        </label>
        <label className="field">
          Ставка, PLN
          <input required min="0" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <div className="rate-preview wide-field" style={{ background: color, color: readableText(color) }}>
          <strong>{name || 'Пример тарифа'}</strong>
          <span>{formatMoney(Number(amount || 0))} {rateUnit === 'hourly' ? '/ час' : '/ визит'}</span>
        </div>
        {error && <p className="form-error wide-field">{error}</p>}
        <footer className="form-actions wide-field">
          <button className="secondary-button" type="button" onClick={onClose}>Отмена</button>
          <button className="primary-button" disabled={saving} type="submit">{saving ? 'Сохраняем…' : 'Сохранить'}</button>
        </footer>
      </form>
    </Modal>
  )
}

export function RatesView({
  serviceTypes,
  onSave,
  onArchive,
}: {
  serviceTypes: ServiceType[]
  onSave: (serviceTypeId: string | null, value: ServiceTypeInput) => Promise<void>
  onArchive: (serviceType: ServiceType) => Promise<void>
}) {
  const [editing, setEditing] = useState<ServiceType | null | undefined>(undefined)
  const activeTypes = serviceTypes.filter((item) => !item.is_archived)

  return (
    <section className="content-section">
      <header className="section-header">
        <div>
          <p className="section-kicker">Цвета и оплата</p>
          <h2>Тарифы</h2>
          <p>Цвет — это подсказка. Расчёты всегда используют сохранённую ставку визита.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setEditing(null)}>+ Добавить тариф</button>
      </header>

      {activeTypes.length ? (
        <div className="rates-list">
          {activeTypes.map((serviceType) => (
            <article className="rate-row" key={serviceType.id}>
              <span className="rate-swatch" style={{ background: serviceType.background_color }} />
              <div className="rate-name"><strong>{serviceType.name}</strong><span>{serviceType.code}</span></div>
              <div className="rate-value">
                <strong>{formatMoney(Number(serviceType.rate_amount), serviceType.currency_code)}</strong>
                <span>{serviceType.rate_unit === 'hourly' ? 'за час' : 'за визит'}</span>
              </div>
              <div className="card-actions">
                <button className="text-button" type="button" onClick={() => setEditing(serviceType)}>Изменить</button>
                <button className="text-button danger-text" type="button" onClick={() => void onArchive(serviceType)}>В архив</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel-empty">
          <h3>Создайте первый тариф</h3>
          <p>Например: «Обычный», зелёный, 32 PLN за час.</p>
        </div>
      )}

      {editing !== undefined && (
        <RateForm
          key={editing?.id ?? 'new'}
          serviceType={editing}
          onClose={() => setEditing(undefined)}
          onSave={(value) => onSave(editing?.id ?? null, value)}
        />
      )}
    </section>
  )
}
