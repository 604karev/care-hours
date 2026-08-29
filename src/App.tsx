import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LoginPage } from './features/auth/LoginPage'
import { WorkspaceApp } from './features/workspace/WorkspaceApp'
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

function ConnectedApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) setWorkspaceId(null)
      setIsLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !supabase) return

    void supabase.rpc('ensure_personal_workspace').then(({ data, error }) => {
      setWorkspaceError(error?.message ?? null)
      setWorkspaceId(error ? null : data as string)
    })
  }, [session])

  if (isLoading) {
    return <main className="loading-screen">Загрузка…</main>
  }

  if (!session) return <LoginPage />

  if (workspaceError) {
    return (
      <main className="loading-screen error-screen">
        <section>
          <h1>Не удалось открыть рабочую область</h1>
          <p>{workspaceError}</p>
        </section>
      </main>
    )
  }

  if (!workspaceId) return <main className="loading-screen">Готовим рабочую область…</main>

  return (
    <WorkspaceApp
      workspaceId={workspaceId}
      email={session.user.email ?? 'Пользователь'}
      onSignOut={async () => { await supabase?.auth.signOut() }}
    />
  )
}

export default function App() {
  return isSupabaseConfigured ? <ConnectedApp /> : <SetupRequired />
}
