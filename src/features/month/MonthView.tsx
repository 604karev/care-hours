import { useMemo, useState } from 'react'
import { displayTime, formatDuration, formatMoney, monthDays, monthLabel, shiftMonth, toIsoDate } from '../workspace/date'
import type { AppSection, Client, ServiceType, Visit } from '../workspace/types'

interface VisitSelection {
  client: Client
  date: string
  visit: Visit | null
}

export function MonthView({
  month,
  clients,
  serviceTypes,
  visits,
  onMonthChange,
  onSelectVisit,
  onNavigate,
}: {
  month: Date
  clients: Client[]
  serviceTypes: ServiceType[]
  visits: Visit[]
  onMonthChange: (date: Date) => void
  onSelectVisit: (selection: VisitSelection) => void
  onNavigate: (section: AppSection) => void
}) {
  const [compact, setCompact] = useState(false)
  const days = useMemo(() => monthDays(month), [month])
  const activeClients = clients.filter((client) => !client.is_archived)
  const activeServices = serviceTypes.filter((service) => !service.is_archived)
  const today = toIsoDate(new Date())

  const byCell = useMemo(() => {
    const map = new Map<string, Visit[]>()
    visits.forEach((visit) => {
      const key = `${visit.client_id}:${visit.visit_date}`
      map.set(key, [...(map.get(key) ?? []), visit].sort((a, b) => a.start_time.localeCompare(b.start_time)))
    })
    return map
  }, [visits])

  const clientTotals = useMemo(() => {
    const map = new Map<string, { minutes: number; visits: number; amount: number }>()
    visits.forEach((visit) => {
      const current = map.get(visit.client_id) ?? { minutes: 0, visits: 0, amount: 0 }
      current.minutes += visit.duration_minutes
      current.visits += 1
      current.amount += Number(visit.amount_snapshot)
      map.set(visit.client_id, current)
    })
    return map
  }, [visits])

  const serviceTotals = useMemo(() => activeServices.map((service) => {
    const serviceVisits = visits.filter((visit) => visit.service_type_id === service.id)
    return {
      service,
      minutes: serviceVisits.reduce((sum, visit) => sum + visit.duration_minutes, 0),
      amount: serviceVisits.reduce((sum, visit) => sum + Number(visit.amount_snapshot), 0),
    }
  }), [activeServices, visits])

  const totalMinutes = visits.reduce((sum, visit) => sum + visit.duration_minutes, 0)
  const totalAmount = visits.reduce((sum, visit) => sum + Number(visit.amount_snapshot), 0)

  if (!activeServices.length || !activeClients.length) {
    return (
      <section className="content-section">
        <header className="section-header"><div><p className="section-kicker">Главный экран</p><h2>Месячный табель</h2></div></header>
        <div className="onboarding-grid">
          <article className={activeServices.length ? 'onboarding-card complete' : 'onboarding-card'}>
            <span>1</span><h3>Добавьте тарифы</h3><p>Цвет, ставка и способ расчёта для каждого типа визита.</p>
            <button className="secondary-button" type="button" onClick={() => onNavigate('rates')}>{activeServices.length ? 'Готово' : 'Перейти к тарифам'}</button>
          </article>
          <article className={activeClients.length ? 'onboarding-card complete' : 'onboarding-card'}>
            <span>2</span><h3>Добавьте клиентов</h3><p>Укажите планы и обычную продолжительность визита.</p>
            <button className="secondary-button" type="button" onClick={() => onNavigate('clients')}>{activeClients.length ? 'Готово' : 'Перейти к клиентам'}</button>
          </article>
        </div>
      </section>
    )
  }

  return (
    <section className="month-section">
      <header className="month-toolbar">
        <div className="month-switcher">
          <button aria-label="Предыдущий месяц" className="icon-button" type="button" onClick={() => onMonthChange(shiftMonth(month, -1))}>‹</button>
          <div><p className="section-kicker">Месячный табель</p><h2>{monthLabel(month)}</h2></div>
          <button aria-label="Следующий месяц" className="icon-button" type="button" onClick={() => onMonthChange(shiftMonth(month, 1))}>›</button>
        </div>
        <div className="toolbar-actions">
          <button className="secondary-button" type="button" onClick={() => onMonthChange(new Date())}>Сегодня</button>
          <button className="secondary-button" type="button" onClick={() => setCompact((value) => !value)}>{compact ? 'Подробнее' : 'Компактно'}</button>
        </div>
      </header>

      <div className="summary-strip">
        {serviceTotals.map(({ service, minutes, amount }) => (
          <article className="summary-card" key={service.id}>
            <span className="rate-swatch" style={{ background: service.background_color }} />
            <div><strong>{service.name}</strong><span>{formatDuration(minutes)} · {formatMoney(amount, service.currency_code)}</span></div>
          </article>
        ))}
        <article className="summary-card total-card"><div><strong>Итого</strong><span>{visits.length} виз. · {formatDuration(totalMinutes)} · {formatMoney(totalAmount)}</span></div></article>
      </div>

      <div className={compact ? 'calendar-scroll compact-calendar' : 'calendar-scroll'}>
        <div className="calendar-grid" style={{ gridTemplateColumns: `230px repeat(${days.length}, minmax(${compact ? 72 : 104}px, 1fr))` }}>
          <div className="calendar-corner">Клиент</div>
          {days.map((day) => (
            <div className={`day-heading ${day.isWeekend ? 'weekend' : ''} ${day.date === today ? 'today' : ''}`} key={day.date}>
              <span>{day.weekday}</span><strong>{day.day}</strong>
            </div>
          ))}

          {activeClients.map((client) => {
            const totals = clientTotals.get(client.id) ?? { minutes: 0, visits: 0, amount: 0 }
            const hoursProgress = client.planned_minutes_per_month
              ? Math.min(100, (totals.minutes / client.planned_minutes_per_month) * 100)
              : 0
            return (
              <div className="calendar-row" key={client.id} style={{ gridColumn: `1 / span ${days.length + 1}` }}>
                <div className="client-heading-cell">
                  <strong>{client.display_name}</strong>
                  <span>{formatDuration(totals.minutes)} · {totals.visits} виз.</span>
                  {client.planned_minutes_per_month && <div className="progress-track"><span style={{ width: `${hoursProgress}%` }} /></div>}
                </div>
                {days.map((day) => {
                  const cellVisits = byCell.get(`${client.id}:${day.date}`) ?? []
                  return (
                    <div
                      aria-label={`${client.display_name}, ${day.date}`}
                      className={`calendar-cell ${day.isWeekend ? 'weekend' : ''} ${day.date === today ? 'today' : ''}`}
                      key={day.date}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectVisit({ client, date: day.date, visit: null })}
                      onKeyDown={(event) => { if (event.key === 'Enter') onSelectVisit({ client, date: day.date, visit: null }) }}
                    >
                      {cellVisits.map((visit) => (
                        <button
                          className="visit-chip"
                          key={visit.id}
                          style={{ background: visit.background_color_snapshot, color: visit.text_color_snapshot }}
                          type="button"
                          onClick={(event) => { event.stopPropagation(); onSelectVisit({ client, date: day.date, visit }) }}
                        >
                          {displayTime(visit.start_time)}–{displayTime(visit.end_time)}
                        </button>
                      ))}
                      {!cellVisits.length && <span className="add-cell">+</span>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      <p className="calendar-hint">Нажмите на клетку, чтобы добавить визит. Таблица прокручивается горизонтально.</p>
    </section>
  )
}

export type { VisitSelection }
