import { useState, type FormEvent } from 'react'
import { formatDuration } from '../workspace/date'
import { Modal } from '../workspace/Modal'
import type { Client, ServiceType } from '../workspace/types'
import { useI18n } from '../../i18n/useI18n'

export interface ClientInput {
  display_name: string
  address: string | null
  client_code: string | null
  default_service_type_id: string | null
  typical_start_time: string | null
  typical_duration_minutes: number | null
  planned_minutes_per_month: number | null
  planned_visits_per_month: number | null
}

function ClientForm({
  client,
  serviceTypes,
  onClose,
  onSave,
}: {
  client: Client | null
  serviceTypes: ServiceType[]
  onClose: () => void
  onSave: (value: ClientInput) => Promise<void>
}) {
  const { t } = useI18n()
  const [name, setName] = useState(client?.display_name ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [code, setCode] = useState(client?.client_code ?? '')
  const [serviceTypeId, setServiceTypeId] = useState(client?.default_service_type_id ?? '')
  const [startTime, setStartTime] = useState(client?.typical_start_time?.slice(0, 5) ?? '09:00')
  const [duration, setDuration] = useState(String(client?.typical_duration_minutes ?? 60))
  const [plannedHours, setPlannedHours] = useState(
    client?.planned_minutes_per_month == null ? '' : String(client.planned_minutes_per_month / 60),
  )
  const [plannedVisits, setPlannedVisits] = useState(
    client?.planned_visits_per_month == null ? '' : String(client.planned_visits_per_month),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({
        display_name: name.trim(),
        address: address.trim() || null,
        client_code: code.trim() || null,
        default_service_type_id: serviceTypeId || null,
        typical_start_time: startTime || null,
        typical_duration_minutes: duration ? Number(duration) : null,
        planned_minutes_per_month: plannedHours ? Math.round(Number(plannedHours) * 60) : null,
        planned_visits_per_month: plannedVisits ? Number(plannedVisits) : null,
      })
      onClose()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('error.saveClient'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={client ? t('clients.edit') : t('clients.new')} onClose={onClose}>
      <form className="entity-form" onSubmit={submit}>
        <label className="field wide-field">
          {t('clients.displayName')}
          <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          {t('clients.code')}
          <input maxLength={40} value={code} onChange={(event) => setCode(event.target.value)} />
        </label>
        <label className="field">
          {t('clients.defaultRate')}
          <select value={serviceTypeId} onChange={(event) => setServiceTypeId(event.target.value)}>
            <option value="">{t('clients.notSelected')}</option>
            {serviceTypes.map((serviceType) => (
              <option key={serviceType.id} value={serviceType.id}>{serviceType.name}</option>
            ))}
          </select>
        </label>
        <label className="field wide-field">
          {t('clients.address')}
          <input value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <label className="field">
          {t('clients.start')}
          <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </label>
        <label className="field">
          {t('clients.duration')}
          <input min="1" type="number" value={duration} onChange={(event) => setDuration(event.target.value)} />
        </label>
        <label className="field">
          {t('clients.monthlyHours')}
          <input min="0" step="0.5" type="number" value={plannedHours} onChange={(event) => setPlannedHours(event.target.value)} />
        </label>
        <label className="field">
          {t('clients.monthlyVisits')}
          <input min="0" type="number" value={plannedVisits} onChange={(event) => setPlannedVisits(event.target.value)} />
        </label>
        {error && <p className="form-error wide-field">{error}</p>}
        <footer className="form-actions wide-field">
          <button className="secondary-button" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </footer>
      </form>
    </Modal>
  )
}

export function ClientsView({
  clients,
  serviceTypes,
  onSave,
  onArchive,
}: {
  clients: Client[]
  serviceTypes: ServiceType[]
  onSave: (clientId: string | null, value: ClientInput) => Promise<void>
  onArchive: (client: Client) => Promise<void>
}) {
  const { language, t } = useI18n()
  const [editing, setEditing] = useState<Client | null | undefined>(undefined)
  const activeClients = clients.filter((client) => !client.is_archived)

  return (
    <section className="content-section">
      <header className="section-header">
        <div>
          <p className="section-kicker">{t('clients.kicker')}</p>
          <h2>{t('clients.title')}</h2>
          <p>{t('clients.description')}</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setEditing(null)}>{t('clients.add')}</button>
      </header>

      {activeClients.length ? (
        <div className="entity-grid">
          {activeClients.map((client) => {
            const service = serviceTypes.find((item) => item.id === client.default_service_type_id)
            return (
              <article className="entity-card" key={client.id}>
                <div className="entity-card-heading">
                  <div>
                    <h3>{client.display_name}</h3>
                    <p>{client.address || client.client_code || t('clients.noAddress')}</p>
                  </div>
                  {service && <span className="color-badge" style={{ background: service.background_color, color: service.text_color }}>{service.code}</span>}
                </div>
                <dl className="entity-details">
                  <div><dt>{t('clients.typicalVisit')}</dt><dd>{client.typical_start_time?.slice(0, 5) ?? '—'} · {client.typical_duration_minutes ? formatDuration(client.typical_duration_minutes, language) : '—'}</dd></div>
                  <div><dt>{t('clients.plan')}</dt><dd>{client.planned_minutes_per_month ? formatDuration(client.planned_minutes_per_month, language) : '—'} · {client.planned_visits_per_month ?? '—'} {t('unit.visits')}</dd></div>
                </dl>
                <footer className="card-actions">
                  <button className="text-button" type="button" onClick={() => setEditing(client)}>{t('common.edit')}</button>
                  <button className="text-button danger-text" type="button" onClick={() => void onArchive(client)}>{t('common.archive')}</button>
                </footer>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="panel-empty">
          <h3>{t('clients.emptyTitle')}</h3>
          <p>{t('clients.emptyText')}</p>
        </div>
      )}

      {editing !== undefined && (
        <ClientForm
          key={editing?.id ?? 'new'}
          client={editing}
          serviceTypes={serviceTypes}
          onClose={() => setEditing(undefined)}
          onSave={(value) => onSave(editing?.id ?? null, value)}
        />
      )}
    </section>
  )
}
