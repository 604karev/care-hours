import { describe, expect, it } from 'vitest'
import { translations } from './translations'

describe('translations', () => {
  it('contains the same keys in every language', () => {
    const russianKeys = Object.keys(translations.ru).sort()

    expect(Object.keys(translations.pl).sort()).toEqual(russianKeys)
    expect(Object.keys(translations.en).sort()).toEqual(russianKeys)
  })
})
