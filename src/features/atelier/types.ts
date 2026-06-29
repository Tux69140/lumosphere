export type LotStatus = 'en_attente' | 'en_traitement' | 'integre' | 'erreur'

export type DocumentType = 'pdf' | 'telegram' | 'youtube' | 'html'

// 2 états seulement : 'ai_suggested' = proposé par l'IA (en attente),
// 'manual' = validé/humain (saisi à la main OU suggestion acceptée).
export type KeywordSource = 'manual' | 'ai_suggested'

export type LotDocument = {
  id: number
  lot_id: number
  titre: string
  type_document: DocumentType
  status: LotStatus
  source_item_id: string | null
  contenu_brut: string | null
  contenu_revise: string | null
  hash_contenu: string | null
  selected: boolean
  theme_id: number | null
  theme_nom: string | null
  // Thème proposé par l'IA à l'import, en attente de validation humaine.
  theme_suggested_id: number | null
  theme_suggested_nom: string | null
  oeuvre_id: number | null
  oeuvre_nom: string | null
  citation_id: number | null
  date_publication: string | null
  keywords: DocumentKeyword[]
  created_at: string
  updated_at: string
}

export type DocumentKeyword = {
  keyword_id: number
  mot: string
  source: KeywordSource
}

export type Lot = {
  id: number
  nom: string
  source_type: DocumentType
  status: LotStatus
  assigned_to: number | null
  assigned_prenom: string | null
  assigned_nom: string | null
  created_by: number | null
  creator_prenom: string | null
  creator_nom: string | null
  description: string | null
  error_message: string | null
  integrated_at: string | null
  date_source_debut: string | null
  date_source_fin: string | null
  created_at: string
  updated_at: string
  document_count: number
}

export type LotDetail = Lot & {
  documents: LotDocument[]
}

export type JournalEvent = {
  id: number
  lot_id: number
  event_type: string
  old_status: LotStatus | null
  new_status: LotStatus | null
  message: string | null
  actor_id: number | null
  actor_prenom: string | null
  actor_nom: string | null
  created_at: string
}

export type LotCounts = Record<LotStatus | 'total', number>

export type ConformityResult = {
  conforme: boolean
  missing: string[]
  documents_ok: number
  documents_total: number
}

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  en_attente: 'En attente',
  en_traitement: 'En traitement',
  integre: 'Intégré',
  erreur: 'Erreur',
}

export const LOT_STATUS_COLORS: Record<LotStatus, string> = {
  en_attente: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  en_traitement: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  integre: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  erreur: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

export const LOT_VALID_TRANSITIONS: Record<LotStatus, LotStatus[]> = {
  en_attente: ['en_traitement'],
  en_traitement: [],
  integre: [],
  erreur: ['en_traitement'],
}
