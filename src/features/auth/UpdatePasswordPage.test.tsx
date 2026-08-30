import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../i18n/I18nProvider'
import { UpdatePasswordPage } from './UpdatePasswordPage'

const updateUser = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { updateUser } },
}))

describe('UpdatePasswordPage', () => {
  beforeEach(() => updateUser.mockReset())

  const renderPage = () => render(
    <I18nProvider><UpdatePasswordPage onComplete={vi.fn()} /></I18nProvider>,
  )

  it('validates matching passwords', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Новый пароль'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Повторите пароль'), { target: { value: 'different123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Изменить пароль' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Пароли не совпадают.')
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('updates the password and shows success', async () => {
    updateUser.mockResolvedValue({ error: null })
    renderPage()

    fireEvent.change(screen.getByLabelText('Новый пароль'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Повторите пароль'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Изменить пароль' }))

    expect(await screen.findByText('Пароль изменён')).toBeInTheDocument()
    expect(updateUser).toHaveBeenCalledWith({ password: 'password123' })
  })
})
