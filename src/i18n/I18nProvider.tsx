import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { languageLocales, translations, type Language } from './translations'
import { I18nContext, type I18nValue } from './useI18n'

const storageKey = 'care-hours-language'
const supportedLanguages: Language[] = ['ru', 'pl', 'en']

function detectLanguage(): Language {
  const saved = window.localStorage.getItem(storageKey)
  if (supportedLanguages.includes(saved as Language)) return saved as Language

  for (const locale of navigator.languages ?? [navigator.language]) {
    const language = locale.toLowerCase().split('-')[0] as Language
    if (supportedLanguages.includes(language)) return language
  }
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage)

  const value = useMemo<I18nValue>(() => ({
    language,
    locale: languageLocales[language],
    setLanguage: (nextLanguage) => {
      window.localStorage.setItem(storageKey, nextLanguage)
      setLanguageState(nextLanguage)
    },
    t: (key, values) => {
      let result = translations[language][key] ?? translations.en[key] ?? key
      Object.entries(values ?? {}).forEach(([name, replacement]) => {
        result = result.replaceAll(`{{${name}}}`, String(replacement))
      })
      return result
    },
  }), [language])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
