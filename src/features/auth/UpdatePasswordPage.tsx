import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n/useI18n'
import { LanguageSwitcher } from '../../i18n/LanguageSwitcher'

export function UpdatePasswordPage({ onComplete }: { onComplete: () => void }) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [complete, setComplete] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return

    if (password !== confirmation) {
      setError(t('auth.passwordMismatch'))
      return
    }

    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      const normalized = updateError.message.toLowerCase()
      setError(normalized.includes('password should be') || normalized.includes('weak_password')
        ? t('auth.weak')
        : t('auth.updateFailed'))
      setSaving(false)
      return
    }

    setComplete(true)
    setSaving(false)
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="auth-brand">
          <span className="brand-mark">HB</span>
          <span>HourBoard</span>
          <LanguageSwitcher compact />
        </div>

        {complete ? (
          <div className="auth-complete">
            <div className="auth-success-icon" aria-hidden="true">✓</div>
            <h1>{t('auth.passwordUpdated')}</h1>
            <p>{t('auth.passwordUpdatedText')}</p>
            <button className="primary-button" type="button" onClick={onComplete}>{t('auth.continue')}</button>
          </div>
        ) : (
          <>
            <h1>{t('auth.newPasswordTitle')}</h1>
            <p>{t('auth.newPasswordText')}</p>
            <form className="login-form" onSubmit={submit}>
              <label className="field">
                {t('auth.newPassword')}
                <input
                  autoComplete="new-password"
                  minLength={8}
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <label className="field">
                {t('auth.repeatPassword')}
                <input
                  autoComplete="new-password"
                  minLength={8}
                  placeholder={t('auth.repeatPlaceholder')}
                  required
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button" disabled={saving} type="submit">
                {saving ? t('common.saving') : t('auth.updatePassword')}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
