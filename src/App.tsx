import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LoginPage } from './features/auth/LoginPage'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

function SetupRequired() {
  return (
    <main className="setup-shell">
      <section className="setup-card">
        <span className="eyebrow">Care Hours</span>
        <h1>Локальная среда готова</h1>
        <p>
          Интерфейс уже запускается. Чтобы включить вход и облачную базу,
          создайте файл <code>.env.local</code> из примера и добавьте параметры
          проекта Supabase.
        </p>
        <ol>
          <li>Создайте проект на supabase.com.</li>
          <li>Скопируйте Project URL и Publishable key.</li>
          <li>Добавьте их в локальный файл окружения.</li>
          <li>Перезапустите <code>npm run dev</code>.</li>
        </ol>
        <p className="muted">
          Секретный service key в браузер и GitHub добавлять нельзя.
        </p>
      </section>
    </main>
  )
}

function WorkspacePlaceholder({
  session,
  workspaceError,
}: {
  session: Session
  workspaceError: string | null
}) {
  const email = session.user.email ?? 'пользователь'

  const signOut = async () => {
    await supabase?.auth.signOut()
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Care Hours</span>
          <h1>Рабочий табель</h1>
        </div>
        <div className="account-block">
          <span>{email}</span>
          <button className="secondary-button" type="button" onClick={signOut}>
            Выйти
          </button>
        </div>
      </header>

      <section className="empty-state">
        {workspaceError ? (
          <>
            <h2>Вход работает, схема ещё не применена</h2>
            <p>{workspaceError}</p>
          </>
        ) : (
          <>
            <div className="status-dot" aria-hidden="true" />
            <h2>Supabase подключён</h2>
            <p>
              Сессия и рабочая область готовы. Следующим этапом здесь появится
              месячная таблица, клиенты и тарифы.
            </p>
          </>
        )}
      </section>
    </main>
  )
}

function ConnectedApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !supabase) return

    void supabase.rpc('ensure_personal_workspace').then(({ error }) => {
      setWorkspaceError(error?.message ?? null)
    })
  }, [session])

  if (isLoading) {
    return <main className="loading-screen">Загрузка…</main>
  }

  return session ? (
    <WorkspacePlaceholder session={session} workspaceError={workspaceError} />
  ) : (
    <LoginPage />
  )
}

export default function App() {
  return isSupabaseConfigured ? <ConnectedApp /> : <SetupRequired />
}
