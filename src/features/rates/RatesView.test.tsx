import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../i18n/I18nProvider'
import { RatesView } from './RatesView'

describe('RatesView', () => {
  it('saves the currency selected for a rate', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(
      <I18nProvider>
        <RatesView serviceTypes={[]} onSave={onSave} onArchive={vi.fn()} />
      </I18nProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '+ Добавить тариф' }))
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Европейский клиент' } })
    fireEvent.change(screen.getByLabelText('Короткий код'), { target: { value: 'eur' } })
    fireEvent.change(screen.getByLabelText('Ставка'), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText('Валюта'), { target: { value: 'EUR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(null, expect.objectContaining({
        currency_code: 'EUR',
        rate_amount: 25,
      }))
    })
  })
})
