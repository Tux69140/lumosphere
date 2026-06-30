import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { ArrowLeft, ListBullets, ClockCounterClockwise } from '@phosphor-icons/react'
import { useLotDetail, useSetDocumentKeywords } from './useLots'
import { DetailLot } from './components/DetailLot'
import { JournalLot } from './components/JournalLot'
import { BlocErreur } from './components/BlocErreur'

type Tab = 'documents' | 'journal'

export function LotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const lotId = Number(id)
  const [tab, setTab] = useState<Tab>('documents')
  const { data: lot, isLoading, error } = useLotDetail(lotId)
  const setKeywords = useSetDocumentKeywords()

  function handleKeywordsAccepted(docId: number, keywordIds: number[]) {
    if (!lot) return
    const doc = lot.documents.find((d) => d.id === docId)
    if (!doc) return
    // On ne reconstruit que le panier « validé/humain » : les mots-clés déjà
    // manuels + ceux qu'on accepte (l'upsert promeut un 'ai_suggested' en 'manual').
    // Les suggestions IA non acceptées restent telles quelles.
    const manualIds = doc.keywords.filter((kw) => kw.source === 'manual').map((kw) => kw.keyword_id)
    const merged = [...new Set([...manualIds, ...keywordIds])]
    setKeywords.mutate({ lotId: lot.id, docId, keywordIds: merged, source: 'manual' })
  }

  if (isLoading)
    return <p className="py-12 text-center text-sm text-(--color-text-muted)">Chargement...</p>
  if (error)
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <BlocErreur title="Erreur" message={error.message} />
      </div>
    )
  if (!lot)
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <BlocErreur title="Lot introuvable" message={`Le lot #${lotId} n'existe pas.`} />
      </div>
    )

  const tabs: { key: Tab; label: string; icon: typeof ListBullets }[] = [
    { key: 'documents', label: 'Documents', icon: ListBullets },
    { key: 'journal', label: 'Journal', icon: ClockCounterClockwise },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link
        to="/atelier"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-(--color-accent) hover:underline"
      >
        <ArrowLeft size={16} />
        Retour à l'atelier
      </Link>

      {/* Onglets */}
      <div className="mb-6 flex gap-1 border-b border-(--color-border)">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? 'border-(--color-accent) text-(--color-accent)'
                : 'border-transparent text-(--color-text-muted) hover:text-(--color-text)'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'documents' && <DetailLot lot={lot} onKeywordsAccepted={handleKeywordsAccepted} />}
      {tab === 'journal' && <JournalLot lotId={lot.id} />}
    </div>
  )
}
