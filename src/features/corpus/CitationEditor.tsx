import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { X, FloppyDisk, Plus, Robot, Spinner } from '@phosphor-icons/react'
import { z } from 'zod'
import { apiClient } from '@/services/api'
import { MarkdownEditor } from '@/components/MarkdownEditor'

type Keyword = { id: number; mot: string }
type EtatOption = { id: number; nom: string; code: string }
type OeuvreOption = { id: number; nom: string; auteur_nom: string | null }
type ThemeRow = { id: number; nom: string; parent_id: number | null }

type FullCitation = {
  id: number
  contenu: string
  notes: string | null
  oeuvre_id: number
  theme_id: number | null
  etat_id: number
  date_entree: string | null
  keywords: Keyword[]
}

const ETAT_CODE_PUBLIEE = 'P'

// Validation de base (les règles de publication R2 sont vérifiées en plus, et
// re-validées côté serveur dans dal_update_citation).
const baseSchema = z.object({
  contenu: z.string().trim().min(1, 'Le contenu est obligatoire.'),
  oeuvreId: z.number().int().positive('Sélectionnez une œuvre.'),
  etatId: z.number().int().positive('Sélectionnez un état.'),
})

const inputClass =
  'w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)'

type CitationEditorProps = {
  citationId: number
  onClose: () => void
  onSaved: () => void
}

export function CitationEditor({ citationId, onClose, onSaved }: CitationEditorProps) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [oeuvres, setOeuvres] = useState<OeuvreOption[]>([])
  const [themes, setThemes] = useState<ThemeRow[]>([])
  const [etats, setEtats] = useState<EtatOption[]>([])

  const [contenu, setContenu] = useState('')
  const [notes, setNotes] = useState('')
  const [oeuvreId, setOeuvreId] = useState(0)
  const [themeId, setThemeId] = useState(0)
  const [etatId, setEtatId] = useState(0)
  const [dateEntree, setDateEntree] = useState('')
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [aiKwSuggestions, setAiKwSuggestions] = useState<string[]>([])
  const [loadingAiKw, setLoadingAiKw] = useState(false)
  const [suggestedThemeId, setSuggestedThemeId] = useState<number | null>(null)
  const [loadingAiTheme, setLoadingAiTheme] = useState(false)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    setLoadError(null)
    Promise.all([
      apiClient.getCitation(citationId),
      apiClient.findOeuvres(),
      apiClient.findThemes(),
      apiClient.findEtats(),
    ])
      .then(([cit, oeu, thm, eta]) => {
        if (cancelled) return
        if (cit.status !== 'ok' || !cit.data) {
          setLoadError(cit.errors?.[0] ?? 'Citation introuvable.')
          return
        }
        const c = cit.data as FullCitation
        setContenu(c.contenu ?? '')
        setNotes(c.notes ?? '')
        setOeuvreId(c.oeuvre_id)
        setThemeId(c.theme_id ?? 0)
        setEtatId(c.etat_id)
        setDateEntree(c.date_entree ?? '')
        setKeywords(c.keywords ?? [])
        if (oeu.status === 'ok' && oeu.data) setOeuvres(oeu.data as OeuvreOption[])
        if (thm.status === 'ok' && thm.data) setThemes(thm.data as ThemeRow[])
        if (eta.status === 'ok' && eta.data) setEtats(eta.data as EtatOption[])
      })
      .catch(() => {
        if (!cancelled) setLoadError('Impossible de contacter le serveur.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [citationId])

  const selectedEtat = etats.find((e) => e.id === etatId)
  const isPubliee = selectedEtat?.code === ETAT_CODE_PUBLIEE
  // Garde de publication (miroir de R2 : jeu complet requis pour passer en Publiée).
  const publicationBlocked =
    isPubliee && (themeId === 0 || dateEntree === '' || keywords.length === 0)

  function themeLabel(t: ThemeRow): string {
    if (t.parent_id == null) return t.nom
    const parent = themes.find((p) => p.id === t.parent_id)
    return parent ? `${parent.nom} › ${t.nom}` : t.nom
  }

  async function addKeyword() {
    const mot = newKeyword.trim()
    if (!mot) return
    const res = await apiClient.findOrCreateKeyword(mot)
    if (res.status === 'ok' && res.data) {
      const kw = res.data
      setKeywords((prev) => (prev.some((k) => k.id === kw.id) ? prev : [...prev, kw]))
      setNewKeyword('')
    } else {
      toast.error(res.errors?.[0] ?? 'Mot-clé refusé.')
    }
  }

  function removeKeyword(id: number) {
    setKeywords((prev) => prev.filter((k) => k.id !== id))
  }

  async function suggestKeywords() {
    if (!contenu.trim()) {
      toast.error('Saisissez un contenu avant de demander des suggestions.')
      return
    }
    setLoadingAiKw(true)
    setAiKwSuggestions([])
    const res = await apiClient.aiSuggestKeywords(citationId, contenu)
    setLoadingAiKw(false)
    if (res.status === 'ok' && res.data) {
      setAiKwSuggestions(res.data.keywords)
    } else {
      toast.error(res.errors?.[0] ?? 'Échec de la suggestion IA.')
    }
  }

  async function applyAiKeyword(mot: string) {
    const res = await apiClient.findOrCreateKeyword(mot)
    if (res.status === 'ok' && res.data) {
      const kw = res.data
      setKeywords((prev) => (prev.some((k) => k.id === kw.id) ? prev : [...prev, kw]))
      setAiKwSuggestions((prev) => prev.filter((s) => s !== mot))
    } else {
      toast.error(res.errors?.[0] ?? "Impossible d'ajouter le mot-clé.")
    }
  }

  async function suggestTheme() {
    if (!contenu.trim()) {
      toast.error('Saisissez un contenu avant de demander des suggestions.')
      return
    }
    setLoadingAiTheme(true)
    setSuggestedThemeId(null)
    const res = await apiClient.aiSuggestTheme(citationId, contenu)
    setLoadingAiTheme(false)
    if (res.status === 'ok' && res.data) {
      setSuggestedThemeId(res.data.theme_id)
    } else {
      toast.error(res.errors?.[0] ?? 'Échec de la suggestion IA.')
    }
  }

  async function handleSave() {
    setFormError(null)
    const parsed = baseSchema.safeParse({ contenu, oeuvreId, etatId })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Formulaire invalide.')
      return
    }
    if (publicationBlocked) {
      setFormError('Publication impossible : thème, date d’entrée et au moins un mot-clé requis.')
      return
    }
    setSaving(true)
    const res = await apiClient.updateCitation(citationId, {
      contenu,
      notes: notes.trim() === '' ? null : notes,
      oeuvre_id: oeuvreId,
      theme_id: themeId === 0 ? null : themeId,
      etat_id: etatId,
      date_entree: dateEntree === '' ? null : dateEntree,
    })
    if (res.status !== 'ok') {
      // Couvre le verrou concurrent : « en cours d'édition par un autre utilisateur ».
      toast.error(res.errors?.[0] ?? 'Échec de l’enregistrement.')
      setSaving(false)
      return
    }
    const kwRes = await apiClient.setCitationKeywords(
      citationId,
      keywords.map((k) => k.id),
    )
    if (kwRes.status !== 'ok') {
      toast.error(kwRes.errors?.[0] ?? 'Mots-clés non enregistrés.')
      setSaving(false)
      return
    }
    toast.success('Entrée enregistrée.')
    setSaving(false)
    onSaved()
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Content
          className="fixed top-0 right-0 z-50 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-(--color-border) bg-(--color-bg-page) shadow-md focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b border-(--color-border) px-5 py-3">
            <Dialog.Title className="text-base font-semibold text-(--color-text-primary)">
              Éditer l’entrée
            </Dialog.Title>
            <Dialog.Close
              className="rounded-md p-1 text-(--color-text-secondary) hover:bg-(--color-bg-button)"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="text-sm text-(--color-text-secondary)">Chargement…</p>
            ) : loadError ? (
              <p className="rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">
                {loadError}
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-(--color-text-secondary)">
                    Contenu
                  </label>
                  <MarkdownEditor value={contenu} onChange={setContenu} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="ce-oeuvre"
                      className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    >
                      Œuvre
                    </label>
                    <select
                      id="ce-oeuvre"
                      className={inputClass}
                      value={oeuvreId}
                      onChange={(e) => setOeuvreId(Number(e.target.value))}
                    >
                      <option value={0}>— Sélectionner —</option>
                      {oeuvres.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nom}
                          {o.auteur_nom ? ` (${o.auteur_nom})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label
                        htmlFor="ce-theme"
                        className="block text-sm font-medium text-(--color-text-primary)"
                      >
                        Thème
                      </label>
                      <button
                        type="button"
                        onClick={() => void suggestTheme()}
                        disabled={loadingAiTheme}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-(--color-action) hover:bg-(--color-bg-button) disabled:opacity-50"
                      >
                        {loadingAiTheme ? (
                          <Spinner className="h-3 w-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <Robot className="h-3 w-3" aria-hidden="true" />
                        )}
                        Suggérer thème (IA)
                      </button>
                    </div>
                    {suggestedThemeId !== null && (
                      <p className="mb-1 text-xs text-(--color-text-secondary)">
                        Suggestion IA :{' '}
                        <span className="font-medium text-(--color-action)">
                          {themeLabel(
                            themes.find((t) => t.id === suggestedThemeId) ?? {
                              id: 0,
                              nom: '?',
                              parent_id: null,
                            },
                          )}
                        </span>
                        {' — '}sélectionnez-le dans la liste pour valider.
                      </p>
                    )}
                    <select
                      id="ce-theme"
                      className={inputClass}
                      value={themeId}
                      onChange={(e) => {
                        setThemeId(Number(e.target.value))
                        setSuggestedThemeId(null)
                      }}
                    >
                      <option value={0}>— Aucun —</option>
                      {themes.map((t) => (
                        <option
                          key={t.id}
                          value={t.id}
                          className={
                            t.id === suggestedThemeId
                              ? 'font-semibold text-(--color-action)'
                              : undefined
                          }
                        >
                          {themeLabel(t)}
                          {t.id === suggestedThemeId ? ' ★' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ce-etat"
                      className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    >
                      État
                    </label>
                    <select
                      id="ce-etat"
                      className={inputClass}
                      value={etatId}
                      onChange={(e) => setEtatId(Number(e.target.value))}
                    >
                      <option value={0}>— Sélectionner —</option>
                      {etats.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ce-date"
                      className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    >
                      Date d’entrée
                    </label>
                    <input
                      id="ce-date"
                      type="date"
                      className={inputClass}
                      value={dateEntree}
                      onChange={(e) => setDateEntree(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="ce-keywords"
                      className="block text-sm font-medium text-(--color-text-primary)"
                    >
                      Mots-clés
                    </label>
                    <button
                      type="button"
                      onClick={() => void suggestKeywords()}
                      disabled={loadingAiKw}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-(--color-action) hover:bg-(--color-bg-button) disabled:opacity-50"
                    >
                      {loadingAiKw ? (
                        <Spinner className="h-3 w-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <Robot className="h-3 w-3" aria-hidden="true" />
                      )}
                      Suggérer mots-clés (IA)
                    </button>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {keywords.length === 0 && (
                      <span className="text-xs text-(--color-text-secondary)">Aucun mot-clé.</span>
                    )}
                    {keywords.map((k) => (
                      <span
                        key={k.id}
                        className="inline-flex items-center gap-1 rounded-full bg-(--color-tag-bg) px-2 py-0.5 text-xs text-(--color-tag-text)"
                      >
                        {k.mot}
                        <button
                          type="button"
                          onClick={() => removeKeyword(k.id)}
                          aria-label={`Retirer ${k.mot}`}
                          className="rounded-full hover:text-(--color-danger-text)"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {aiKwSuggestions.length > 0 && (
                    <div className="mb-2">
                      <p className="mb-1 text-xs text-(--color-text-secondary)">
                        Suggestions IA — cliquez pour ajouter :
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {aiKwSuggestions.map((mot) => (
                          <button
                            key={mot}
                            type="button"
                            onClick={() => void applyAiKeyword(mot)}
                            className="inline-flex items-center gap-1 rounded-full border border-(--color-action) px-2 py-0.5 text-xs text-(--color-action) hover:bg-(--color-bg-button)"
                          >
                            <Plus className="h-3 w-3" aria-hidden="true" />
                            {mot}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      id="ce-keywords"
                      type="text"
                      className={inputClass}
                      placeholder="Ajouter un mot-clé…"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void addKeyword()
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void addKeyword()}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-2 text-sm text-(--color-action) hover:bg-(--color-bg-button)"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-(--color-text-secondary)">
                    Notes (optionnel)
                  </label>
                  <MarkdownEditor value={notes} onChange={setNotes} />
                </div>

                {publicationBlocked && (
                  <p className="text-xs text-(--color-warning-text)">
                    Pour passer en « Publiée » : thème, date d’entrée et au moins un mot-clé requis.
                  </p>
                )}
                {formError && <p className="text-sm text-(--color-danger-text)">{formError}</p>}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-(--color-border) px-5 py-3">
            <Dialog.Close className="rounded-md px-3 py-2 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)">
              Annuler
            </Dialog.Close>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading || saving || !!loadError}
              className="inline-flex items-center gap-1 rounded-md bg-(--color-action) px-4 py-2 text-sm text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-50"
            >
              <FloppyDisk className="h-4 w-4" aria-hidden="true" />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
