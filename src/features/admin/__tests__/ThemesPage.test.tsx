import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemesPage } from '../ThemesPage'

const MOCK_THEMES = vi.hoisted(() => [
  { id: 1, nom: 'Philosophie', parent_id: null, chemin: 'Philosophie', description: null },
  { id: 2, nom: 'Éthique', parent_id: 1, chemin: 'Philosophie/Éthique', description: 'Sous-thème' },
  { id: 3, nom: 'Littérature', parent_id: null, chemin: 'Littérature', description: null },
])

vi.mock('@/services/api', () => ({
  apiClient: {
    findThemes: vi.fn().mockResolvedValue({ status: 'ok', data: MOCK_THEMES, errors: [] }),
    createTheme: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 4 }, errors: [] }),
    updateTheme: vi.fn().mockResolvedValue({ status: 'ok', data: { id: 1 }, errors: [] }),
    deleteTheme: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'

beforeEach(() => vi.clearAllMocks())

describe('ThemesPage', () => {
  it('affiche les thèmes racines et leurs sous-thèmes', async () => {
    render(<ThemesPage />)
    await waitFor(() => expect(screen.getByText('Philosophie')).toBeInTheDocument())
    expect(screen.getByText('Éthique')).toBeInTheDocument()
    expect(screen.getByText('Littérature')).toBeInTheDocument()
  })

  it('les thèmes racines ont un testid correspondant', async () => {
    render(<ThemesPage />)
    await waitFor(() => screen.getByTestId('theme-item-1'))
    expect(screen.getByTestId('theme-item-3')).toBeInTheDocument()
  })

  it('les sous-thèmes sont présents avec leur testid', async () => {
    render(<ThemesPage />)
    await waitFor(() => screen.getByTestId('theme-item-2'))
  })

  it('affiche le formulaire de détail en cliquant sur un thème racine', async () => {
    render(<ThemesPage />)
    await waitFor(() => screen.getByTestId('theme-item-1'))
    await userEvent.click(screen.getByTestId('theme-item-1'))
    expect((screen.getByLabelText('Nom du thème') as HTMLInputElement).value).toBe('Philosophie')
  })

  it('affiche le parent dans le sélecteur pour un sous-thème', async () => {
    render(<ThemesPage />)
    await waitFor(() => screen.getByTestId('theme-item-2'))
    await userEvent.click(screen.getByTestId('theme-item-2'))
    const select = screen.getByLabelText('Thème parent') as HTMLSelectElement
    expect(select.value).toBe('1')
  })

  it('affiche une erreur si le nom est vide', async () => {
    render(<ThemesPage />)
    await waitFor(() => screen.getByLabelText('Créer un nouveau thème'))
    await userEvent.click(screen.getByLabelText('Créer un nouveau thème'))
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(screen.getByText('Le nom est requis.')).toBeInTheDocument()
    expect(apiClient.createTheme).not.toHaveBeenCalled()
  })

  it('appelle createTheme avec les bonnes données', async () => {
    render(<ThemesPage />)
    await waitFor(() => screen.getByLabelText('Créer un nouveau thème'))
    await userEvent.click(screen.getByLabelText('Créer un nouveau thème'))
    await userEvent.type(screen.getByLabelText('Nom du thème'), 'Poésie')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(apiClient.createTheme).toHaveBeenCalledWith(
        expect.objectContaining({ nom: 'Poésie', parent_id: null }),
      ),
    )
  })
})
