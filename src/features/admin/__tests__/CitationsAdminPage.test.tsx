import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/components/MarkdownEditor', () => ({
  MarkdownEditor: ({ value }: { value: string }) => <div data-testid="md">{value}</div>,
}))

const api = vi.hoisted(() => ({
  findCitations: vi.fn(),
  findEtats: vi.fn(),
  findOeuvres: vi.fn(),
  updateCitation: vi.fn(),
  bulkUpdateCitations: vi.fn(),
  bulkDeleteCitations: vi.fn(),
  getCitation: vi.fn(),
  findThemes: vi.fn(),
  setCitationKeywords: vi.fn(),
  findOrCreateKeyword: vi.fn(),
}))

vi.mock('@/services/api', () => ({ apiClient: api }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { CitationsAdminPage } from '../CitationsAdminPage'

const ok = <T,>(data: T) => Promise.resolve({ status: 'ok' as const, data, errors: [] })

const MOCK_CITATIONS = [
  {
    id: 1,
    contenu: "La liberte commence ou l'ignorance finit.",
    oeuvre_nom: 'Oeuvre Alpha',
    oeuvre_id: 10,
    theme_nom: 'Lumiere',
    auteur_nom: 'Victor Hugo',
    etat_nom: 'A Corriger',
    etat_id: 1,
    etat_couleur: '#ff0000',
    date_entree: '2024-01-15',
  },
  {
    id: 2,
    contenu: 'Ceux qui revent le jour ont connaissance de bien des choses.',
    oeuvre_nom: 'Oeuvre Beta',
    oeuvre_id: 11,
    theme_nom: null,
    auteur_nom: 'Edgar Poe',
    etat_nom: 'Publiee',
    etat_id: 3,
    etat_couleur: '#00aa00',
    date_entree: '2024-02-20',
  },
]

const MOCK_ETATS = [
  { id: 1, nom: 'A Corriger', couleur: '#ff0000' },
  { id: 3, nom: 'Publiee', couleur: '#00aa00' },
]

const MOCK_OEUVRES = [
  { id: 10, nom: 'Oeuvre Alpha', auteur_nom: 'Victor Hugo' },
  { id: 11, nom: 'Oeuvre Beta', auteur_nom: 'Edgar Poe' },
]

beforeEach(() => {
  vi.clearAllMocks()
  api.findCitations.mockReturnValue(ok({ items: MOCK_CITATIONS, next_cursor: null }))
  api.findEtats.mockReturnValue(ok(MOCK_ETATS))
  api.findOeuvres.mockReturnValue(ok(MOCK_OEUVRES))
  api.getCitation.mockReturnValue(
    ok({
      id: 1,
      contenu: "La liberte commence ou l'ignorance finit.",
      notes: null,
      oeuvre_id: 10,
      theme_id: null,
      etat_id: 1,
      date_entree: '2024-01-15',
      keywords: [],
    }),
  )
  api.findThemes.mockReturnValue(ok([]))
})

describe('CitationsAdminPage', () => {
  it('affiche les lignes mocquees dans le tableau', async () => {
    render(<CitationsAdminPage />)
    await waitFor(() => expect(screen.getByText(/La liberte commence/)).toBeInTheDocument())
    expect(screen.getByText(/Ceux qui revent/)).toBeInTheDocument()
    expect(screen.getByText('Victor Hugo')).toBeInTheDocument()
    expect(screen.getByText('Edgar Poe')).toBeInTheDocument()
    expect(screen.getByTestId('citation-row-1')).toBeInTheDocument()
    expect(screen.getByTestId('citation-row-2')).toBeInTheDocument()
  })

  it('la selection active la barre actions groupees', async () => {
    render(<CitationsAdminPage />)
    await waitFor(() => screen.getByTestId('citation-row-1'))

    expect(screen.queryByTestId('bulk-actions-bar')).not.toBeInTheDocument()

    const row = screen.getByTestId('citation-row-1')
    const checkbox = within(row).getByRole('checkbox')
    await userEvent.click(checkbox)

    expect(screen.getByTestId('bulk-actions-bar')).toBeInTheDocument()
  })

  it('bulk-delete declenche les 2 confirms puis appelle bulkDeleteCitations', async () => {
    api.bulkDeleteCitations.mockReturnValue(ok({ deleted: 1 }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<CitationsAdminPage />)
    await waitFor(() => screen.getByTestId('citation-row-1'))

    const row = screen.getByTestId('citation-row-1')
    const checkbox = within(row).getByRole('checkbox')
    await userEvent.click(checkbox)

    const deleteBtn = screen.getByRole('button', { name: /Supprimer/ })
    await userEvent.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(api.bulkDeleteCitations).toHaveBeenCalledWith([1]))
  })

  it('bulk-update etat appelle bulkUpdateCitations avec les bons params', async () => {
    api.bulkUpdateCitations.mockReturnValue(ok({ updated: 1 }))

    render(<CitationsAdminPage />)
    await waitFor(() => screen.getByTestId('citation-row-1'))

    const row = screen.getByTestId('citation-row-1')
    const checkbox = within(row).getByRole('checkbox')
    await userEvent.click(checkbox)

    await waitFor(() => screen.getByTestId('bulk-actions-bar'))

    const etatSelect = screen.getByLabelText(/tat pour les entr/)
    await userEvent.selectOptions(etatSelect, '3')

    const applyBtns = screen.getAllByRole('button', { name: /Appliquer/ })
    const firstApply = applyBtns[0]
    if (!firstApply) throw new Error('Bouton Appliquer introuvable')
    await userEvent.click(firstApply)

    await waitFor(() => expect(api.bulkUpdateCitations).toHaveBeenCalledWith([1], { etat_id: 3 }))
  })

  it('le bouton Editer ouvre CitationEditor', async () => {
    render(<CitationsAdminPage />)
    await waitFor(() => screen.getByTestId('citation-row-1'))

    const row = screen.getByTestId('citation-row-1')
    const editBtn = within(row).getByRole('button', { name: /diter/ })
    await userEvent.click(editBtn)

    await waitFor(() => expect(api.getCitation).toHaveBeenCalledWith(1))
  })
})
