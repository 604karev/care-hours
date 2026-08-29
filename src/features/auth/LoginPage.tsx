import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return

    setError(null)
    setIsSubmitting(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Не удалось войти. Проверьте email и пароль.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <span className="eyebrow">Care Hours</span>
        <h1>Вход в табель</h1>
        <p>Введите данные заранее созданного аккаунта.</p>

        <form className="login-form" onSubmit={submit}>
          <label className="field">
            Email
            <input
              autoComplete="email"
              inputMode="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="field">
            Пароль
            <input
              autoComplete="current-password"
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Входим…' : 'Войти'}
          </button>
        </form>
      </section>
    </main>
  )
}
