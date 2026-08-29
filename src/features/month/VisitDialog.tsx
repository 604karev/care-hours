import { useMemo, useState, type FormEvent } from 'react'
import { calculateVisitAmount, displayTime, formatDuration, formatMoney, minutesToTime, timeToMinutes } from '../workspace/date'
import { Modal } from '../workspace/Modal'
import type { Client, ServiceType, Visit } from '../workspace/types'

export interface VisitInput {
  serviceTypeId: string
  startTime: string
  endTime: string
  shortNote: string | null
}

export function VisitDialog({
  client,
  date,
  visit,
  serviceTypes,
  onClose,
  onSave,
  onDelete,
}: {
  client: Client
  date: string
  visit: Visit | null
  serviceTypes: ServiceType[]
  onClose: () => void
  onSave: (value: VisitInput) => Promise<void>
  onDelete: (() => Promise<void>) | null
}) {
  const initialStart = visit ? displayTime(visit.start_time) : client.typical_start_time?.slice(0, 5) ?? '09:00'
  const initialEnd = visit
    ? displayTime(visit.end_time)
    : minutesToTime(timeToMinutes(initialStart) + (client.typical_duration_minutes ?? 60))
  const [serviceTypeId, setServiceTypeId] = useState(
    visit?.service_type_id ?? client.default_service_type_id ?? serviceTypes[0]?.id ?? '',
  )
  const [startTime, setStartTime] = useState(initialStart)
  const [endTime, setEndTime] = useState(initialEnd)
  const [note, setNote] = useState(visit?.short_note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const calculation = useMemo(() => {
    const duration = timeToMinutes(endTime) - timeToMinutes(startTime)
    const service = serviceTypes.find((item) => item.id === serviceTypeId)
    if (!service || duration <= 0) return { duration, amount: 0, currency: 'PLN' }
    const amount = calculateVisitAmount(duration, service.rate_unit, Number(service.rate_amount))
    return { duration, amount, currency: service.currency_code }
  }, [endTime, serviceTypeId, serviceTypes, startTime])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (calculation.duration <= 0) {
      setError('Время окончания должно быть позже времени начала')
      return
    }
    if (!serviceTypeId) {
      setError('Сначала выберите тариф')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({ serviceTypeId, startTime, endTime, shortNote: note.trim() || null })
      onClose()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Не удалось сохранить визит')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!onDelete || !window.confirm('Удалить этот визит?')) return
    setSaving(true)
    setError(null)
    try {
      await onDelete()
      onClose()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Не удалось удалить визит')
      setSaving(false)
    }
  }

  return (
    <Modal title={visit ? 'Редактировать визит' : 'Добавить визит'} onClose={onClose}>
      <div className="visit-context">
        <strong>{client.display_name}</strong>
        <span>{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(new Date(`${date}T12:00:00`))}</span>
      </div>
      <form className="entity-form" onSubmit={submit}>
        <label className="field wide-field">
          Тариф
          <select required value={serviceTypeId} onChange={(event) => setServiceTypeId(event.target.value)}>
            <option value="">Выберите тариф</option>
            {serviceTypes.map((serviceType) => (
              <option key={serviceType.id} value={serviceType.id}>{serviceType.name} · {formatMoney(Number(serviceType.rate_amount), serviceType.currency_code)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Начало
          <input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </label>
        <label className="field">
          Окончание
          <input required type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </label>
        <label className="field wide-field">
          Короткая заметка
          <input maxLength={300} placeholder="Необязательно" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="visit-calculation wide-field">
          <span>{calculation.duration > 0 ? formatDuration(calculation.duration) : 'Проверьте время'}</span>
          <strong>{formatMoney(calculation.amount, calculation.currency)}</strong>
        </div>
        {error && <p className="form-error wide-field">{error}</p>}
        <footer className="form-actions wide-field split-actions">
          <div>{onDelete && <button className="text-button danger-text" disabled={saving} type="button" onClick={() => void remove()}>Удалить</button>}</div>
          <div className="form-actions-group">
            <button className="secondary-button" type="button" onClick={onClose}>Отмена</button>
            <button className="primary-button" disabled={saving} type="submit">{saving ? 'Сохраняем…' : 'Сохранить'}</button>
          </div>
        </footer>
      </form>
    </Modal>
  )
}
