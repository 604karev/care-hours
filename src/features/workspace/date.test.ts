import { describe, expect, it } from 'vitest'
import { calculateVisitAmount, formatDuration, monthLabel, minutesToTime, sumAmountsByCurrency, timeToMinutes } from './date'

describe('visit calculations', () => {
  it('converts time to minutes and back', () => {
    expect(timeToMinutes('08:20')).toBe(500)
    expect(minutesToTime(500)).toBe('08:20')
  })

  it('calculates and rounds an hourly visit', () => {
    expect(calculateVisitAmount(50, 'hourly', 32)).toBe(26.67)
  })

  it('uses the full fixed rate for a visit', () => {
    expect(calculateVisitAmount(25, 'per_visit', 60)).toBe(60)
  })

  it('formats dates and durations for the selected language', () => {
    const january = new Date(2026, 0, 1)

    expect(monthLabel(january, 'pl')).toContain('2026')
    expect(monthLabel(january, 'pl').toLowerCase()).toContain('styczeń')
    expect(formatDuration(90, 'en')).toBe('1 h 30 min')
  })

  it('keeps totals for different currencies separate', () => {
    expect(sumAmountsByCurrency([
      { currency: 'PLN', amount: 100 },
      { currency: 'EUR', amount: 25.25 },
      { currency: 'PLN', amount: 50.5 },
    ])).toEqual([
      { currency: 'EUR', amount: 25.25 },
      { currency: 'PLN', amount: 150.5 },
    ])
  })
})
