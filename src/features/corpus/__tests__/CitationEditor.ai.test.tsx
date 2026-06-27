import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/components/MarkdownEditor', () => ({
  MarkdownEditor: ({ value }: { value: string }) => <div data-testid="md">{value}</div>,
}))

const api = vi.hoisted(() => ({
  getCitation: vi.fn(),
  findOeuvres: vi.fn(),
  findThemes: vi.fn(),
  findEtats: vi.fn(),
  updateCitation: vi.fn(),
  setCitationKeywords: vi.fn(),
  findOrCreateKeyword: vi.fn(),
  aiSuggestKeywords: vi.fn(),
  aiSuggestTheme: vi.fn(),
}))
vi.mock('@/services/api', () => ({ apiClient: api }))

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))

import { CitationEditor } from '../CitationEditor'

const ok = <T,>(data: T) => Promise.resolve({ status: 'ok' as const, data, errors: [] })

beforeEach(() => {
  vi.clearAllMocks()
  api.getCitation.mockReturnValue(
    ok({
      id: 42,
      contenu: 'La lumière guide le monde',
      notes: null,
      oeuvre_id: 1,
      theme_id: null,
      etat_id: 1,
      date_entree: null,
      keywords: [],
    }),
  )
  api.findOeuvres.mockReturnValue(ok([{ id: 1, nom: 'Œuvre A', auteur_nom: 'Auteur X' }]))
  api.findThemes.mockReturnValue(
    ok([
      { id: 5, nom: 'Lumière', parent_id: null },
      { id: 8, nom: 'Obscurité', parent_id: null },
    ]),
  )
  api.findEtats.mockReturnValue(ok([{ id: 1, nom: 'À Corriger', code: 'C' }]))
})

describe('CitationEditor — IA', () => {
  it('le bouton "Suggérer mots-clés" appelle aiSuggestKeywords avec le contenu courant', async () => {
    api.aiSuggestKeywords.mockReturnValue(ok({ keywords: ['lumière', 'guide'] }))
    render(<CitationEditor citationId={42} onClose={() => {}} onSaved={() => {}} />)
    await screen.findByText('La lumière guide le monde')

    await userEvent.click(screen.getByRole('button', { name: /Suggérer mots-clés \(IA\)/i }))

    await waitFor(() => expect(api.aiSuggestKeywords).toHaveBeenCalledTimes(1))
    expect(api.aiSuggestKeywords).toHaveBeenCalledWith(42, 'La lumière guide le monde')
  })

  it('les suggestions apparaissent en chips cliquables', async () => {
    api.aiSuggestKeywords.mockReturnValue(ok({ keywords: ['lumière', 'guide'] }))
    render(<CitationEditor citationId={42} onClose={() => {}} onSaved={() => {}} />)
    await screen.findByText('La lumière guide le monde')

    await userEvent.click(screen.getByRole('button', { name: /Suggérer mots-clés \(IA\)/i }))

    expect(await screen.findByRole('button', { name: /lumière/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guide/i })).toBeInTheDocument()
  })

  it('clic sur un chip ajoute le mot-clé à la liste mais ne sauvegarde pas automatiquement', async () => {
    api.aiSuggestKeywords.mockReturnValue(ok({ keywords: ['lumière', 'guide'] }))
    api.findOrCreateKeyword.mockReturnValue(ok({ id: 99, mot: 'lumière' }))
    render(<CitationEditor citationId={42} onClose={() => {}} onSaved={() => {}} />)
    await screen.findByText('La lumière guide le monde')

    await userEvent.click(screen.getByRole('button', { name: /Suggérer mots-clés \(IA\)/i }))
    await screen.findByRole('button', { name: /lumière/i })

    await userEvent.click(screen.getByRole('button', { name: /lumière/i }))

    await waitFor(() => expect(api.findOrCreateKeyword).toHaveBeenCalledWith('lumière'))
    // Mot-clé apparaît dans les tags
    await waitFor(() => expect(screen.getByLabelText('Retirer lumière')).toBeInTheDocument())
    // Pas de sauvegarde automatique
    expect(api.updateCitation).not.toHaveBeenCalled()
    expect(api.setCitationKeywords).not.toHaveBeenCalled()
  })
})
