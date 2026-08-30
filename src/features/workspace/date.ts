import { languageLocales, translations, type Language } from '../../i18n/translations'

export function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { start: toIsoDate(start), end: toIsoDate(end) }
}

export function monthDays(date: Date, language: Language = 'ru') {
  const weekdayFormatter = new Intl.DateTimeFormat(languageLocales[language], { weekday: 'short' })
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return Array.from({ length: count }, (_, index) => {
    const value = new Date(date.getFullYear(), date.getMonth(), index + 1)
    return {
      date: toIsoDate(value),
      day: index + 1,
      weekday: weekdayFormatter.format(value).replace('.', ''),
      isWeekend: value.getDay() === 0 || value.getDay() === 6,
    }
  })
}

export function monthLabel(date: Date, language: Language = 'ru') {
  const monthFormatter = new Intl.DateTimeFormat(languageLocales[language], { month: 'long', year: 'numeric' })
  const label = monthFormatter.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(value: number) {
  const safeValue = Math.max(0, Math.min(value, 23 * 60 + 59))
  return `${String(Math.floor(safeValue / 60)).padStart(2, '0')}:${String(safeValue % 60).padStart(2, '0')}`
}

export function formatDuration(minutes: number, language: Language = 'ru') {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const hour = translations[language]['unit.hour']
  const minute = translations[language]['unit.minute']
  if (!hours) return `${rest} ${minute}`
  if (!rest) return `${hours} ${hour}`
  return `${hours} ${hour} ${rest} ${minute}`
}

export function formatMoney(value: number, currency = 'PLN', language: Language = 'ru') {
  return new Intl.NumberFormat(languageLocales[language], {
    style: 'currency',
    currency,
  }).format(value)
}

export function displayTime(value: string) {
  return value.slice(0, 5)
}

export function calculateVisitAmount(durationMinutes: number, rateUnit: 'hourly' | 'per_visit', rateAmount: number) {
  if (durationMinutes <= 0 || rateAmount < 0) return 0
  if (rateUnit === 'per_visit') return Math.round(rateAmount * 100) / 100
  return Math.round((durationMinutes / 60) * rateAmount * 100) / 100
}
