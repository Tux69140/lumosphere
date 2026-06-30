import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { SettingsPage } from '../SettingsPage'

vi.mock('@/services/api', () => ({
  apiClient: {
    getConfig: vi.fn().mockResolvedValue({ status: 'ok', data: '0', errors: [] }),
    setConfig: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'

beforeEach(() => vi.clearAllMocks())

describe('SettingsPage', () => {
  it('reflète l’état désactivé du mode diagnostic', async () => {
    renderWithClient(<SettingsPage />)
    const sw = await screen.findByRole('switch')
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'false'))
    expect(apiClient.getConfig).toHaveBeenCalledWith('mode_debug_global')
  })

  it('active le mode diagnostic au clic (setConfig avec "1")', async () => {
    renderWithClient(<SettingsPage />)
    const sw = await screen.findByRole('switch')
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'false'))
    await userEvent.click(sw)
    await waitFor(() => expect(apiClient.setConfig).toHaveBeenCalledWith('mode_debug_global', '1'))
  })

  it('reflète l’état activé quand la config vaut "1"', async () => {
    vi.mocked(apiClient.getConfig).mockResolvedValueOnce({ status: 'ok', data: '1', errors: [] })
    renderWithClient(<SettingsPage />)
    const sw = await screen.findByRole('switch')
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'))
  })
})
