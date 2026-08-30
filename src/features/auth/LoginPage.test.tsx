import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { I18nProvider } from '../../i18n/I18nProvider'

const authMocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: authMocks },
}))

describe('LoginPage', () => {
  const renderPage = () => render(<I18nProvider><LoginPage /></I18nProvider>)

  beforeEach(() => {
    authMocks.signInWithPassword.mockReset()
    authMocks.signUp.mockReset()
  })

  it('signs in with email and password', async () => {
    authMocks.signInWithPassword.mockResolvedValue({ error: null })
    renderPage()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' wife@example.com ' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    await waitFor(() => {
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith({ email: 'wife@example.com', password: 'password123' })
    })
  })

  it('validates matching passwords before registration', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Регистрация' }))

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Повторите пароль'), { target: { value: 'different123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Пароли не совпадают.')
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })

  it('shows email confirmation instructions after registration', async () => {
    authMocks.signUp.mockResolvedValue({ data: { session: null }, error: null })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Регистрация' }))

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Повторите пароль'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    expect(await screen.findByText('Проверьте почту')).toBeInTheDocument()
    expect(screen.getByText(/new@example.com/)).toBeInTheDocument()
    expect(authMocks.signUp).toHaveBeenCalledOnce()
  })

  it('switches the interface language', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Язык'), { target: { value: 'pl' } })

    expect(screen.getByRole('heading', { name: 'Witaj ponownie' })).toBeInTheDocument()
    expect(window.localStorage.getItem('care-hours-language')).toBe('pl')
  })
})
