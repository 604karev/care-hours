import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClientsView, type ClientInput } from '../clients/ClientsView'
import { MonthView, type VisitSelection } from '../month/MonthView'
import { VisitDialog, type VisitInput } from '../month/VisitDialog'
import { RatesView, type ServiceTypeInput } from '../rates/RatesView'
import { calculateVisitAmount, monthBounds, timeToMinutes } from './date'
import type { AppSection, Client, ServiceType, Visit } from './types'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n/useI18n'
import { LanguageSwitcher } from '../../i18n/LanguageSwitcher'

function asError(message: string, error?: { message: string } | null) {
  return new Error(error?.message || message)
}

export function WorkspaceApp({
  workspaceId,
  email,
  onSignOut,
}: {
  workspaceId: string
  email: string
  onSignOut: () => Promise<void>
}) {
  const { t } = useI18n()
  const [section, setSection] = useState<AppSection>('month')
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [selection, setSelection] = useState<VisitSelection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const bounds = useMemo(() => monthBounds(month), [month])

  const refresh = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    let active = true

    const load = async () => {
      const [workspaceResult, ratesResult, clientsResult, visitsResult] = await Promise.all([
        client.from('workspaces').select('id').eq('id', workspaceId).single(),
        client.from('service_types').select('*').eq('workspace_id', workspaceId).order('sort_order').order('created_at'),
        client.from('clients').select('*').eq('workspace_id', workspaceId).order('sort_order').order('created_at'),
        client.from('visits').select('*').eq('workspace_id', workspaceId).gte('visit_date', bounds.start).lte('visit_date', bounds.end).order('start_time'),
      ])

      const firstError = workspaceResult.error || ratesResult.error || clientsResult.error || visitsResult.error
      if (firstError) throw firstError
      if (!active) return

      setServiceTypes((ratesResult.data ?? []).map((item) => ({ ...item, rate_amount: Number(item.rate_amount) })) as ServiceType[])
      setClients((clientsResult.data ?? []) as Client[])
      setVisits((visitsResult.data ?? []).map((item) => ({
        ...item,
        rate_amount_snapshot: Number(item.rate_amount_snapshot),
        amount_snapshot: Number(item.amount_snapshot),
      })) as Visit[])
      setError(null)
      setLoading(false)
    }

    void load().catch((caughtError) => {
      if (!active) return
      setError(caughtError instanceof Error ? caughtError.message : t('error.loadWorkspace'))
      setLoading(false)
    })

    return () => { active = false }
  }, [bounds.end, bounds.start, revision, t, workspaceId])

  const saveClient = async (clientId: string | null, value: ClientInput) => {
    if (!supabase) return
    const payload = { ...value, workspace_id: workspaceId }
    const result = clientId
      ? await supabase.from('clients').update(payload).eq('id', clientId).eq('workspace_id', workspaceId)
      : await supabase.from('clients').insert({ ...payload, sort_order: clients.length })
    if (result.error) throw asError(t('error.saveClient'), result.error)
    refresh()
  }

  const archiveClient = async (client: Client) => {
    if (!supabase || !window.confirm(t('confirm.archiveClient', { name: client.display_name }))) return
    const { error: archiveError } = await supabase.from('clients').update({ is_archived: true }).eq('id', client.id).eq('workspace_id', workspaceId)
    if (archiveError) setError(archiveError.message)
    else refresh()
  }

  const saveServiceType = async (serviceTypeId: string | null, value: ServiceTypeInput) => {
    if (!supabase) return
    const payload = { ...value, workspace_id: workspaceId }
    const result = serviceTypeId
      ? await supabase.from('service_types').update(payload).eq('id', serviceTypeId).eq('workspace_id', workspaceId)
      : await supabase.from('service_types').insert({ ...payload, sort_order: serviceTypes.length })
    if (result.error) throw asError(t('error.saveRate'), result.error)
    refresh()
  }

  const archiveServiceType = async (serviceType: ServiceType) => {
    if (!supabase || !window.confirm(t('confirm.archiveRate', { name: serviceType.name }))) return
    const { error: archiveError } = await supabase.from('service_types').update({ is_archived: true }).eq('id', serviceType.id).eq('workspace_id', workspaceId)
    if (archiveError) setError(archiveError.message)
    else refresh()
  }

  const saveVisit = async (value: VisitInput) => {
    if (!supabase || !selection) return
    const serviceType = serviceTypes.find((item) => item.id === value.serviceTypeId)
    if (!serviceType) throw new Error(t('error.rateNotFound'))
    const duration = timeToMinutes(value.endTime) - timeToMinutes(value.startTime)
    if (duration <= 0) throw new Error(t('error.invalidTime'))

    const preserveSnapshot = selection.visit?.service_type_id === serviceType.id
    const rateUnit = preserveSnapshot ? selection.visit!.rate_unit_snapshot : serviceType.rate_unit
    const rateAmount = preserveSnapshot ? Number(selection.visit!.rate_amount_snapshot) : Number(serviceType.rate_amount)
    const currency = preserveSnapshot ? selection.visit!.currency_code_snapshot : serviceType.currency_code
    const amount = calculateVisitAmount(duration, rateUnit, rateAmount)

    const payload = {
      workspace_id: workspaceId,
      client_id: selection.client.id,
      service_type_id: serviceType.id,
      visit_date: selection.date,
      start_time: value.startTime,
      end_time: value.endTime,
      unpaid_break_minutes: 0,
      duration_minutes: duration,
      rate_unit_snapshot: rateUnit,
      rate_amount_snapshot: rateAmount,
      currency_code_snapshot: currency,
      service_name_snapshot: preserveSnapshot ? selection.visit!.service_name_snapshot : serviceType.name,
      background_color_snapshot: preserveSnapshot ? selection.visit!.background_color_snapshot : serviceType.background_color,
      text_color_snapshot: preserveSnapshot ? selection.visit!.text_color_snapshot : serviceType.text_color,
      amount_snapshot: amount,
      short_note: value.shortNote,
    }

    const result = selection.visit
      ? await supabase.from('visits').update(payload).eq('id', selection.visit.id).eq('workspace_id', workspaceId)
      : await supabase.from('visits').insert(payload)
    if (result.error) throw asError(t('error.saveVisit'), result.error)

    const visitDate = new Date(`${selection.date}T12:00:00`)
    await supabase.from('monthly_sheets').upsert({
      workspace_id: workspaceId,
      year: visitDate.getFullYear(),
      month: visitDate.getMonth() + 1,
    }, { onConflict: 'workspace_id,year,month', ignoreDuplicates: true })
    refresh()
  }

  const deleteVisit = async () => {
    if (!supabase || !selection?.visit) return
    const { error: deleteError } = await supabase.from('visits').delete().eq('id', selection.visit.id).eq('workspace_id', workspaceId)
    if (deleteError) throw asError(t('error.deleteVisit'), deleteError)
    refresh()
  }

  const navItems: Array<{ id: AppSection; label: string; icon: string }> = [
    { id: 'month', label: t('nav.month'), icon: '▦' },
    { id: 'clients', label: t('nav.clients'), icon: '♙' },
    { id: 'rates', label: t('nav.rates'), icon: '●' },
  ]

  return (
    <div className="workspace-layout">
      <aside className="sidebar">
        <div className="brand-block"><span className="brand-mark">HB</span><div><strong>HourBoard</strong><span>{t('app.tagline')}</span></div></div>
        <nav className="main-nav" aria-label={t('app.mainNav')}>
          {navItems.map((item) => (
            <button className={section === item.id ? 'nav-button active' : 'nav-button'} key={item.id} type="button" onClick={() => setSection(item.id)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-account"><LanguageSwitcher /><span title={email}>{email}</span><button className="text-button" type="button" onClick={() => void onSignOut()}>{t('app.signOut')}</button></div>
      </aside>

      <main className="workspace-main">
        <div className="mobile-toolbar"><strong>HourBoard</strong><LanguageSwitcher compact /></div>
        {error && <div className="global-error"><span>{error}</span><button aria-label={t('common.close')} type="button" onClick={() => setError(null)}>×</button></div>}
        {loading ? (
          <div className="workspace-loading"><span className="spinner" />{t('app.timesheetLoading')}</div>
        ) : (
          <>
            {section === 'month' && <MonthView month={month} clients={clients} serviceTypes={serviceTypes} visits={visits} onMonthChange={setMonth} onSelectVisit={setSelection} onNavigate={setSection} />}
            {section === 'clients' && <ClientsView clients={clients} serviceTypes={serviceTypes.filter((item) => !item.is_archived)} onSave={saveClient} onArchive={archiveClient} />}
            {section === 'rates' && <RatesView serviceTypes={serviceTypes} onSave={saveServiceType} onArchive={archiveServiceType} />}
          </>
        )}
      </main>

      <nav className="mobile-nav" aria-label={t('app.mobileNav')}>
        {navItems.map((item) => (
          <button className={section === item.id ? 'active' : ''} key={item.id} type="button" onClick={() => setSection(item.id)}><span>{item.icon}</span>{item.label}</button>
        ))}
      </nav>

      {selection && (
        <VisitDialog
          key={selection.visit?.id ?? `${selection.client.id}:${selection.date}`}
          client={selection.client}
          date={selection.date}
          visit={selection.visit}
          serviceTypes={serviceTypes.filter((item) => !item.is_archived || item.id === selection.visit?.service_type_id)}
          onClose={() => setSelection(null)}
          onSave={saveVisit}
          onDelete={selection.visit ? deleteVisit : null}
        />
      )}
    </div>
  )
}
