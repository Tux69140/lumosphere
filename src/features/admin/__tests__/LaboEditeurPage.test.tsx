import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Le moteur réel embarque ProseMirror (incompatible jsdom) → on mocke la
// façade pour tester l'agencement de la page en isolation.
vi.mock('@/components/MarkdownEditor', () => ({
  MarkdownEditor: ({ value }: { value: string }) => <div data-testid="editor">{value}</div>,
}))

import { LaboEditeurPage } from '../LaboEditeurPage'

describe('LaboEditeurPage', () => {
  it('affiche le titre, l’éditeur et le panneau source', () => {
    render(<LaboEditeurPage />)
    expect(screen.getByRole('heading', { name: /labo éditeur markdown/i })).toBeInTheDocument()
    expect(screen.getByTestId('editor')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /source markdown/i })).toBeInTheDocument()
  })
})
