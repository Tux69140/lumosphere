import { useState } from 'react'
import { FloppyDisk } from '@phosphor-icons/react'
import type { LotDocument } from '../types'

type Props = {
  document: LotDocument
  onSave: (contenuRevise: string) => void
  saving?: boolean
}

export function EditeurRevision({ document, onSave, saving }: Props) {
  const [contenu, setContenu] = useState(document.contenu_revise || document.contenu_brut || '')
  const hasChanges = contenu !== (document.contenu_revise || document.contenu_brut || '')

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-(--color-text)">Révision du texte</h3>
        <button
          type="button"
          onClick={() => onSave(contenu)}
          disabled={!hasChanges || saving}
          className="flex items-center gap-1.5 rounded-md bg-(--color-accent) px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          <FloppyDisk size={16} />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
      <textarea
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
        rows={12}
        className="w-full rounded-lg border border-(--color-border) bg-(--color-bg-card) p-3 text-sm text-(--color-text) focus:border-(--color-accent) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
      />
      <p className="text-xs text-(--color-text-muted)">
        {contenu.length} caractères
        {hasChanges && ' — Modifications non enregistrées'}
      </p>
    </div>
  )
}
