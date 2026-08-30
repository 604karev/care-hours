import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LoginPage } from './features/auth/LoginPage'
import { UpdatePasswordPage } from './features/auth/UpdatePasswordPage'
import { WorkspaceApp } from './features/workspace/WorkspaceApp'
import { I18nProvider } from './i18n/I18nProvider'
import { useI18n } from './i18n/useI18n'
import { LanguageSwitcher } from './i18n/LanguageSwitcher'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

function SetupRequired() {
  const { t } = useI18n()
  return (
    <main className="setup-shell">
      <section className="setup-card">
        <span className="eyebrow">Care Hours</span>
        <LanguageSwitcher />
        <h1>{t('setup.title')}</h1>
        <p>{t('setup.text')}</p>
        <ol>
          <li>{t('setup.step1')}</li>
          <li>{t('setup.step2')}</li>
          <li>{t('setup.step3')}</li>
          <li>{t('setup.step4')}</li>
        </ol>
        <p className="muted">{t('setup.secret')}</p>
      </section>
    </main>
  )
}

function ConnectedApp() {
  const { t } = useI18n()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => (
    window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')
  ))

  useEffect(() => {
    if (!supabase) return

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
      if (!nextSession) {
        setWorkspaceId(null)
        setIsPasswordRecovery(false)
      }
      setIsLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session || !supabase || isPasswordRecovery) return

    void supabase.rpc('ensure_personal_workspace').then(({ data, error }) => {
      setWorkspaceError(error?.message ?? null)
      setWorkspaceId(error ? null : data as string)
    })
  }, [isPasswordRecovery, session])

  if (isLoading) {
    return <main className="loading-screen">{t('app.loading')}</main>
  }

  if (!session) return <LoginPage />

  if (isPasswordRecovery) {
    return <UpdatePasswordPage onComplete={() => {
      const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
      window.history.replaceState({}, document.title, baseUrl.pathname)
      setIsPasswordRecovery(false)
    }} />
  }

  if (workspaceError) {
    return (
      <main className="loading-screen error-screen">
        <section>
          <h1>{t('app.workspaceFailed')}</h1>
          <p>{workspaceError}</p>
        </section>
      </main>
    )
  }

  if (!workspaceId) return <main className="loading-screen">{t('app.workspaceLoading')}</main>

  return (
    <WorkspaceApp
      workspaceId={workspaceId}
      email={session.user.email ?? t('common.user')}
      onSignOut={async () => { await supabase?.auth.signOut() }}
    />
  )
}

function AppContent() {
  return isSupabaseConfigured ? <ConnectedApp /> : <SetupRequired />
}

export default function App() {
  return <I18nProvider><AppContent /></I18nProvider>
}
