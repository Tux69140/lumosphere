import { describe, it, expect } from 'vitest'
import { roundtripMarkdown } from '../roundtrip'
import { SAMPLE_MARKDOWN } from '../sampleDoc'

describe('roundtripMarkdown', () => {
  it('est idempotent (un second passage ne change plus rien)', () => {
    const once = roundtripMarkdown(SAMPLE_MARKDOWN)
    const twice = roundtripMarkdown(once)
    expect(twice).toBe(once)
  })

  it('préserve tous les éléments piégeux', () => {
    const out = roundtripMarkdown(SAMPLE_MARKDOWN)
    expect(out).toContain('# Titre H1')
    expect(out).toContain('## Titre H2')
    expect(out).toContain('**gras**')
    expect(out).toContain('*italique*')
    expect(out).toContain('[lien](https://example.org)')
    expect(out).toContain('> Une citation')
    expect(out).toContain('| Colonne A | Colonne B |')
    expect(out).toContain('![texte alternatif](images/exemple.png)')
    expect(out).toContain('[^note]')
    expect(out).toContain('[^note]:')
    expect(out).toContain('😀')
  })
})
