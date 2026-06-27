import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { CitationCard } from '../CitationCard'

const base = {
  contenu: 'Texte simple',
  oeuvre_nom: 'Telegram',
  theme_nom: 'Guidance',
  auteur_nom: 'Lulumineuse',
  notes: null,
  mots_cles: ['Foi', 'Lumière'],
}

describe('CitationCard', () => {
  it("affiche l'œuvre dans l'en-tête", () => {
    render(<CitationCard {...base} />)
    expect(screen.getByText('Telegram')).toBeInTheDocument()
  })

  it("affiche le thème dans l'en-tête", () => {
    render(<CitationCard {...base} />)
    expect(screen.getByText(/Guidance/)).toBeInTheDocument()
  })

  it('rend le Markdown (gras → <strong>)', () => {
    render(<CitationCard {...base} contenu="un mot **important** ici" />)
    expect(screen.getByText('important').tagName).toBe('STRONG')
  })

  it("masque l'auteur quand c'est Lulumineuse", () => {
    render(<CitationCard {...base} auteur_nom="Lulumineuse" />)
    expect(screen.queryByText(/Lulumineuse/)).not.toBeInTheDocument()
  })

  it("affiche l'auteur quand différent de Lulumineuse", () => {
    render(<CitationCard {...base} auteur_nom="Autre Auteur" />)
    expect(screen.getByText(/Autre Auteur/)).toBeInTheDocument()
  })

  it('masque les notes quand vides', () => {
    render(<CitationCard {...base} notes="   " />)
    expect(screen.queryByTestId('publication-notes')).not.toBeInTheDocument()
  })

  it('affiche les notes (Markdown) quand non vides', () => {
    render(<CitationCard {...base} notes="Voir *aussi* le contexte" />)
    expect(screen.getByTestId('publication-notes')).toBeInTheDocument()
    expect(screen.getByText('aussi').tagName).toBe('EM')
  })

  it("n'affiche jamais l'état", () => {
    render(<CitationCard {...base} notes="x" />)
    expect(screen.queryByText(/À Corriger|À Réviser|Publiée/)).not.toBeInTheDocument()
  })

  it('affiche les mots-clés en badges non cliquables', () => {
    render(<CitationCard {...base} />)
    const badge = screen.getByText('Foi')
    expect(badge.closest('button')).toBeNull()
  })

  it('affiche un bouton Favori activé', () => {
    render(<CitationCard {...base} />)
    expect(screen.getByLabelText('Ajouter aux favoris')).not.toBeDisabled()
  })

  it('le bouton Favori est rempli (fill) quand isFavorited=true', () => {
    render(<CitationCard {...base} isFavorited={true} onToggleFavorite={vi.fn()} />)
    const btn = screen.getByLabelText('Retirer des favoris')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('affiche le bouton Éditer seulement si canEdit', () => {
    const { rerender } = render(<CitationCard {...base} canEdit={false} />)
    expect(screen.queryByLabelText('Éditer cette entrée')).not.toBeInTheDocument()
    rerender(<CitationCard {...base} canEdit />)
    expect(screen.getByLabelText('Éditer cette entrée')).toBeEnabled()
  })

  it('déclenche onEdit au clic sur Éditer', async () => {
    const onEdit = vi.fn()
    render(<CitationCard {...base} canEdit onEdit={onEdit} />)
    await userEvent.click(screen.getByLabelText('Éditer cette entrée'))
    expect(onEdit).toHaveBeenCalledOnce()
  })
})
