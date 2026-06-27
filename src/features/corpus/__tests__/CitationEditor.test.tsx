import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// L'éditeur Markdown réel embarque ProseMirror (incompatible jsdom) → mock léger.
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
}))
vi.mock('@/services/api', () => ({ apiClient: api }))

import { CitationEditor } from '../CitationEditor'

const ok = <T,>(data: T) => Promise.resolve({ status: 'ok' as const, data, errors: [] })

beforeEach(() => {
  vi.clearAllMocks()
  api.getCitation.mockReturnValue(
    ok({
      id: 42,
      contenu: 'Bonjour le monde',
      notes: null,
      oeuvre_id: 1,
      theme_id: null,
      etat_id: 1,
      date_entree: null,
      keywords: [{ id: 7, mot: 'foi' }],
    }),
  )
  api.findOeuvres.mockReturnValue(ok([{ id: 1, nom: 'Œuvre A', auteur_nom: 'Auteur X' }]))
  api.findThemes.mockReturnValue(ok([{ id: 5, nom: 'Lumière', parent_id: null }]))
  api.findEtats.mockReturnValue(
    ok([
      { id: 1, nom: 'À Corriger', code: 'C' },
      { id: 3, nom: 'Publiée', code: 'P' },
    ]),
  )
})

describe('CitationEditor', () => {
  it('charge et pré-remplit la citation (contenu + mot-clé existant)', async () => {
    render(<CitationEditor citationId={42} onClose={() => {}} onSaved={() => {}} />)
    expect(await screen.findByText('Bonjour le monde')).toBeInTheDocument()
    expect(screen.getByText('foi')).toBeInTheDocument()
    expect(screen.getByLabelText('Œuvre')).toHaveValue('1')
  })

  it('bloque la publication sans jeu complet (thème/date/mot-clé manquants)', async () => {
    const onSaved = vi.fn()
    render(<CitationEditor citationId={42} onClose={() => {}} onSaved={onSaved} />)
    await screen.findByText('Bonjour le monde')

    // Retire le seul mot-clé, puis tente de passer en « Publiée ».
    await userEvent.click(screen.getByLabelText('Retirer foi'))
    await userEvent.selectOptions(screen.getByLabelText('État'), '3')

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    expect(api.updateCitation).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getByText(/Publication impossible/)).toBeInTheDocument()
  })

  it('enregistre une édition valide (update + mots-clés) puis notifie', async () => {
    api.updateCitation.mockReturnValue(ok({ id: 42 }))
    api.setCitationKeywords.mockReturnValue(ok(null))
    const onSaved = vi.fn()
    render(<CitationEditor citationId={42} onClose={() => {}} onSaved={onSaved} />)
    await screen.findByText('Bonjour le monde')

    await userEvent.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() =>
      expect(api.updateCitation).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ oeuvre_id: 1, etat_id: 1 }),
      ),
    )
    expect(api.setCitationKeywords).toHaveBeenCalledWith(42, [7])
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
  })
})
