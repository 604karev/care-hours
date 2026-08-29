import { describe, expect, it } from 'vitest'
import { calculateVisitAmount, minutesToTime, timeToMinutes } from './date'

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
})
