import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}))

describe('App without cloud configuration', () => {
  it('shows the Supabase setup instructions', () => {
    render(<App />)

    expect(screen.getByText('Локальная среда готова')).toBeInTheDocument()
  })
})
