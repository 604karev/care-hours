import { useI18n } from './useI18n'
import type { Language } from './translations'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n()

  return (
    <label className={compact ? 'language-switcher compact' : 'language-switcher'}>
      <span>{compact ? '🌐' : t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
      >
        <option value="ru">{compact ? 'RU' : t('language.ru')}</option>
        <option value="pl">{compact ? 'PL' : t('language.pl')}</option>
        <option value="en">{compact ? 'EN' : t('language.en')}</option>
      </select>
    </label>
  )
}
