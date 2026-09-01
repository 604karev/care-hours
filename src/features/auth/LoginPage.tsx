import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n/useI18n'
import { LanguageSwitcher } from '../../i18n/LanguageSwitcher'

type AuthMode = 'login' | 'register' | 'forgot'

function authErrorMessage(message: string, mode: AuthMode, t: (key: string) => string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) return t('auth.invalid')
  if (normalized.includes('email not confirmed')) return t('auth.notConfirmed')
  if (normalized.includes('user already registered')) return t('auth.exists')
  if (normalized.includes('password should be') || normalized.includes('weak_password')) return t('auth.weak')
  if (normalized.includes('rate limit')) return t('auth.rateLimit')
  if (normalized.includes('signup_disabled') || normalized.includes('signups not allowed')) return t('auth.signupDisabled')

  return mode === 'login'
    ? t('auth.loginFailed')
    : mode === 'register' ? t('auth.registerFailed') : t('auth.resetFailed')
}

export function LoginPage() {
  const { t } = useI18n()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [emailNotice, setEmailNotice] = useState<{ email: string; type: 'register' | 'recovery' } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
    setEmailNotice(null)
    setPassword('')
    setPasswordConfirmation('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return

    setError(null)

    if (mode === 'register' && password !== passwordConfirmation) {
      setError(t('auth.passwordMismatch'))
      return
    }

    setIsSubmitting(true)

    if (mode === 'forgot') {
      const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })

      if (authError) {
        setError(authErrorMessage(authError.message, mode, t))
        setIsSubmitting(false)
        return
      }

      setEmailNotice({ email: email.trim(), type: 'recovery' })
      setIsSubmitting(false)
      return
    }

    if (mode === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        setError(authErrorMessage(authError.message, mode, t))
        setIsSubmitting(false)
      }
      return
    }

    const emailRedirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo },
    })

    if (authError) {
      setError(authErrorMessage(authError.message, mode, t))
      setIsSubmitting(false)
      return
    }

    if (!data.session) {
      setEmailNotice({ email: email.trim(), type: 'register' })
      setIsSubmitting(false)
    }
  }

  if (emailNotice) {
    return (
      <main className="login-shell">
        <section className="login-card auth-success-card">
          <div className="auth-success-icon" aria-hidden="true">✓</div>
          <span className="eyebrow">{emailNotice.type === 'register' ? t('auth.almost') : t('auth.recoverySent')}</span>
          <LanguageSwitcher />
          <h1>{t('auth.checkEmail')}</h1>
          <p>{t(emailNotice.type === 'register' ? 'auth.confirmation' : 'auth.recoveryConfirmation', { email: emailNotice.email })}</p>
          <p className="auth-help">{t('auth.spam')}</p>
          <button className="primary-button" type="button" onClick={() => changeMode('login')}>
            {t('auth.back')}
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="auth-brand">
          <span className="brand-mark">HB</span>
          <span>HourBoard</span>
          <LanguageSwitcher compact />
        </div>
        <h1>{mode === 'login' ? t('auth.welcome') : mode === 'register' ? t('auth.create') : t('auth.resetTitle')}</h1>
        <p>
          {mode === 'login'
            ? t('auth.loginText')
            : mode === 'register' ? t('auth.registerText') : t('auth.resetText')}
        </p>

        {mode !== 'forgot' && (
          <div className="auth-tabs" aria-label={t('auth.tabs')}>
            <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => changeMode('login')}>
              {t('auth.login')}
            </button>
            <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => changeMode('register')}>
              {t('auth.register')}
            </button>
          </div>
        )}

        <form className="login-form" onSubmit={submit}>
          <label className="field">
            {t('auth.email')}
            <input
              autoComplete="email"
              inputMode="email"
              placeholder="name@example.com"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {mode !== 'forgot' && (
            <label className="field">
              {t('auth.password')}
              <input
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                placeholder={t('auth.passwordPlaceholder')}
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          )}

          {mode === 'login' && (
            <button className="forgot-button" type="button" onClick={() => changeMode('forgot')}>
              {t('auth.forgotPassword')}
            </button>
          )}

          {mode === 'register' && (
            <label className="field">
              {t('auth.repeatPassword')}
              <input
                autoComplete="new-password"
                minLength={8}
                placeholder={t('auth.repeatPlaceholder')}
                required
                type="password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </label>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? mode === 'login' ? t('auth.signingIn') : mode === 'register' ? t('auth.creating') : t('auth.sendingReset')
              : mode === 'login' ? t('auth.signIn') : mode === 'register' ? t('auth.createAccount') : t('auth.sendReset')}
          </button>

          {mode === 'forgot' && (
            <button className="auth-back-button" type="button" onClick={() => changeMode('login')}>
              {t('auth.back')}
            </button>
          )}
        </form>
        <p className="privacy-notice">
          {t('auth.privacyText')}{' '}
          <a href="https://hourboard.pl/privacy/" rel="noreferrer" target="_blank">{t('common.privacyPolicy')}</a>
        </p>
      </section>
    </main>
  )
}
