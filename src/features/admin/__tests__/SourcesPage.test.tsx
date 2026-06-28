import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithClient } from '@/test/renderWithClient'
import { SourcesPage } from '../SourcesPage'

const MOCK_CHANNELS = vi.hoisted(() => [
  {
    id: 1,
    label: 'Citations du matin',
    source_type: 'telegram',
    chat_id: -1001234567890,
    enabled: true,
    run_every_hours: 12,
    oeuvre_id: null,
    last_run_at: '2026-06-27 08:00:00',
    last_error: null,
  },
  {
    id: 2,
    label: 'Canal du soir',
    source_type: 'telegram',
    chat_id: -1009876543210,
    enabled: false,
    run_every_hours: 6,
    oeuvre_id: 1,
    last_run_at: null,
    last_error: 'Bot non admin',
  },
])

const MOCK_OEUVRES = vi.hoisted(() => [{ id: 1, nom: 'Œuvre A' }])

vi.mock('@/services/api', () => ({
  apiClient: {
    findTelegramChannels: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: MOCK_CHANNELS, errors: [] }),
    findOeuvres: vi.fn().mockResolvedValue({ status: 'ok', data: MOCK_OEUVRES, errors: [] }),
    createCollectSource: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 3 }, errors: [] }),
    updateCollectSource: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 1 }, errors: [] }),
    deleteCollectSource: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'

beforeEach(() => vi.clearAllMocks())

describe('SourcesPage', () => {
  it('affiche la liste des canaux Telegram au chargement', async () => {
    renderWithClient(<SourcesPage />)
    await waitFor(() => expect(screen.getByText('Citations du matin')).toBeInTheDocument())
    expect(screen.getByText('Canal du soir')).toBeInTheDocument()
  })

  it('affiche les onglets YouTube et Pages web désactivés', async () => {
    renderWithClient(<SourcesPage />)
    expect(screen.getByRole('button', { name: /YouTube/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Pages web/i })).toBeDisabled()
  })

  it('remplit le formulaire en cliquant sur un canal', async () => {
    renderWithClient(<SourcesPage />)
    await waitFor(() => screen.getByTestId('canal-item-1'))
    await userEvent.click(screen.getByTestId('canal-item-1'))
    expect((screen.getByLabelText('Nom du canal') as HTMLInputElement).value).toBe(
      'Citations du matin',
    )
    expect((screen.getByLabelText('Identifiant du canal Telegram') as HTMLInputElement).value).toBe(
      '-1001234567890',
    )
  })

  it('affiche le diagnostic (dernière erreur) du canal sélectionné', async () => {
    renderWithClient(<SourcesPage />)
    await waitFor(() => screen.getByTestId('canal-item-2'))
    await userEvent.click(screen.getByTestId('canal-item-2'))
    expect(screen.getByText('Bot non admin')).toBeInTheDocument()
  })

  it('refuse la création si le nom et le chat_id sont vides', async () => {
    renderWithClient(<SourcesPage />)
    await waitFor(() => screen.getByLabelText('Ajouter un canal Telegram'))
    await userEvent.click(screen.getByLabelText('Ajouter un canal Telegram'))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(screen.getByText('Le nom du canal est requis.')).toBeInTheDocument()
    expect(apiClient.createCollectSource).not.toHaveBeenCalled()
  })

  it('appelle createCollectSource avec les bonnes données', async () => {
    renderWithClient(<SourcesPage />)
    await waitFor(() => screen.getByLabelText('Ajouter un canal Telegram'))
    await userEvent.click(screen.getByLabelText('Ajouter un canal Telegram'))
    await userEvent.type(screen.getByLabelText('Nom du canal'), 'Nouveau canal')
    await userEvent.type(screen.getByLabelText('Identifiant du canal Telegram'), '-100555')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(apiClient.createCollectSource).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'Nouveau canal', chat_id: '-100555' }),
      ),
    )
  })

  it('appelle deleteCollectSource après confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    renderWithClient(<SourcesPage />)
    await waitFor(() => screen.getByTestId('canal-item-1'))
    await userEvent.click(screen.getByTestId('canal-item-1'))
    await waitFor(() => screen.getByRole('button', { name: /supprimer/i }))
    await userEvent.click(screen.getByRole('button', { name: /supprimer/i }))
    await waitFor(() => expect(apiClient.deleteCollectSource).toHaveBeenCalledWith(1))
  })
})
