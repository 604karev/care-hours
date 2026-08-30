import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

type AuthMode = 'login' | 'register'

function authErrorMessage(message: string, mode: AuthMode) {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) return 'Неверный email или пароль.'
  if (normalized.includes('email not confirmed')) return 'Сначала подтвердите email по ссылке из письма.'
  if (normalized.includes('user already registered')) return 'Аккаунт с таким email уже существует. Попробуйте войти.'
  if (normalized.includes('password should be')) return 'Пароль слишком простой. Используйте не менее 8 символов.'
  if (normalized.includes('rate limit')) return 'Слишком много попыток. Подождите немного и попробуйте снова.'

  return mode === 'login'
    ? 'Не удалось войти. Попробуйте ещё раз.'
    : 'Не удалось создать аккаунт. Попробуйте ещё раз.'
}

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setError(null)
    setConfirmationEmail(null)
    setPassword('')
    setPasswordConfirmation('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return

    setError(null)

    if (mode === 'register' && password !== passwordConfirmation) {
      setError('Пароли не совпадают.')
      return
    }

    setIsSubmitting(true)

    if (mode === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        setError(authErrorMessage(authError.message, mode))
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
      setError(authErrorMessage(authError.message, mode))
      setIsSubmitting(false)
      return
    }

    if (!data.session) {
      setConfirmationEmail(email.trim())
      setIsSubmitting(false)
    }
  }

  if (confirmationEmail) {
    return (
      <main className="login-shell">
        <section className="login-card auth-success-card">
          <div className="auth-success-icon" aria-hidden="true">✓</div>
          <span className="eyebrow">Почти готово</span>
          <h1>Проверьте почту</h1>
          <p>
            Мы отправили ссылку для подтверждения на <strong>{confirmationEmail}</strong>.
            После перехода по ссылке можно войти в свой табель.
          </p>
          <p className="auth-help">Если письма нет, проверьте папку «Спам».</p>
          <button className="primary-button" type="button" onClick={() => changeMode('login')}>
            Вернуться ко входу
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="auth-brand">
          <span className="brand-mark">CH</span>
          <span>Care Hours</span>
        </div>
        <h1>{mode === 'login' ? 'С возвращением' : 'Создайте аккаунт'}</h1>
        <p>
          {mode === 'login'
            ? 'Войдите, чтобы продолжить работу с табелем.'
            : 'Ваши клиенты, тарифы и табели будут доступны только вам.'}
        </p>

        <div className="auth-tabs" aria-label="Авторизация">
          <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => changeMode('login')}>
            Вход
          </button>
          <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => changeMode('register')}>
            Регистрация
          </button>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label className="field">
            Email
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

          <label className="field">
            Пароль
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              placeholder="Не менее 8 символов"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {mode === 'register' && (
            <label className="field">
              Повторите пароль
              <input
                autoComplete="new-password"
                minLength={8}
                placeholder="Введите пароль ещё раз"
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
              ? mode === 'login' ? 'Входим…' : 'Создаём аккаунт…'
              : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>
      </section>
    </main>
  )
}
