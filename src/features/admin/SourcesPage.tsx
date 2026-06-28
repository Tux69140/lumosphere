import { useState } from 'react'
import { Plus, Trash, TelegramLogo, YoutubeLogo, Globe } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import { useTelegramChannels, useOeuvres } from '@/services/referenceQueries'
import type { TelegramChannel } from '@/services/referenceQueries'

type Oeuvre = { id: number; nom: string }

type SourceTab = 'telegram' | 'youtube' | 'html'

const TABS: { key: SourceTab; label: string; icon: typeof TelegramLogo; enabled: boolean }[] = [
  { key: 'telegram', label: 'Telegram', icon: TelegramLogo, enabled: true },
  { key: 'youtube', label: 'YouTube', icon: YoutubeLogo, enabled: false },
  { key: 'html', label: 'Pages web', icon: Globe, enabled: false },
]

const schema = z.object({
  label: z.string().min(1, 'Le nom du canal est requis.'),
  chat_id: z.string().regex(/^-?\d+$/, "L'identifiant du canal doit être un nombre entier."),
  run_every_hours: z
    .number({ message: 'Indiquez un nombre d’heures.' })
    .int()
    .min(0, 'Le délai ne peut pas être négatif.')
    .max(255, 'Au maximum 255 heures.'),
})

type FormState = {
  label: string
  chat_id: string
  oeuvre_id: string
  run_every_hours: string
  enabled: boolean
}

const emptyForm: FormState = {
  label: '',
  chat_id: '',
  oeuvre_id: '',
  run_every_hours: '12',
  enabled: true,
}

const inputClass =
  'w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action)'

function formatDate(value: string | null): string {
  if (!value) return 'Jamais'
  const d = new Date(value.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('fr-FR')
}

export function SourcesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<SourceTab>('telegram')
  const { data: channels = [] } = useTelegramChannels()
  const { data: oeuvres = [] } = useOeuvres() as { data?: Oeuvre[] }

  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.telegramChannels })
    qc.invalidateQueries({ queryKey: queryKeys.collectSources })
  }

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.createCollectSource(payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Création impossible.')
        return
      }
      invalidate()
      setSelectedId((r.data as { id: number }).id)
      toast.success('Canal créé.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const updateMut = useMutation({
    mutationFn: (vars: { id: number; payload: Record<string, unknown> }) =>
      apiClient.updateCollectSource(vars.id, vars.payload),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Modification impossible.')
        return
      }
      invalidate()
      toast.success('Modifications enregistrées.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiClient.deleteCollectSource(id),
    onSuccess: (r) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Suppression impossible.')
        return
      }
      invalidate()
      setSelectedId(null)
      setForm(emptyForm)
      toast.success('Canal supprimé.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })
  const saving = createMut.isPending || updateMut.isPending

  const selected =
    typeof selectedId === 'number' ? channels.find((c) => c.id === selectedId) : undefined

  function selectChannel(channel: TelegramChannel) {
    setSelectedId(channel.id)
    setForm({
      label: channel.label,
      chat_id: channel.chat_id != null ? String(channel.chat_id) : '',
      oeuvre_id: channel.oeuvre_id != null ? String(channel.oeuvre_id) : '',
      run_every_hours: channel.run_every_hours != null ? String(channel.run_every_hours) : '',
      enabled: channel.enabled,
    })
    setErrors({})
  }

  function startNew() {
    setSelectedId('new')
    setForm(emptyForm)
    setErrors({})
  }

  function handleSave() {
    const parsed = schema.safeParse({
      label: form.label,
      chat_id: form.chat_id.trim(),
      run_every_hours: Number(form.run_every_hours),
    })
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as keyof FormState] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    const payload = {
      label: form.label.trim(),
      chat_id: form.chat_id.trim(),
      oeuvre_id: form.oeuvre_id ? Number(form.oeuvre_id) : null,
      run_every_hours: Number(form.run_every_hours),
      enabled: form.enabled,
    }
    if (selectedId === 'new') createMut.mutate(payload)
    else if (typeof selectedId === 'number') updateMut.mutate({ id: selectedId, payload })
  }

  function handleDelete() {
    if (typeof selectedId !== 'number') return
    if (
      !window.confirm(
        'Supprimer définitivement ce canal ? Cette action est irréversible. Les entrées déjà produites sont conservées, mais perdent le lien vers ce canal.',
      )
    )
      return
    deleteMut.mutate(selectedId)
  }

  const showPanel = selectedId !== null

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Sources</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Configurez les canaux dont les contenus alimentent l’atelier.
      </p>

      <div className="mb-6 flex gap-1 border-b border-(--color-border)">
        {TABS.map(({ key, label, icon: Icon, enabled }) => (
          <button
            key={key}
            onClick={() => enabled && setTab(key)}
            disabled={!enabled}
            title={enabled ? undefined : 'Bientôt disponible'}
            className={[
              'flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              !enabled
                ? 'cursor-not-allowed border-transparent text-(--color-text-placeholder) opacity-60'
                : tab === key
                  ? 'border-(--color-accent) text-(--color-accent)'
                  : 'border-transparent text-(--color-text-secondary) hover:text-(--color-text-primary)',
            ].join(' ')}
          >
            <Icon size={16} aria-hidden="true" /> {label}
            {!enabled && <span className="ml-1 text-xs">(bientôt)</span>}
          </button>
        ))}
      </div>

      {tab !== 'telegram' ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-(--color-border) text-sm text-(--color-text-placeholder)">
          Ce type de source sera disponible prochainement.
        </div>
      ) : (
        <div className="flex min-h-[500px] overflow-hidden rounded-lg border border-(--color-border)">
          <aside className="flex w-56 shrink-0 flex-col">
            <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3">
              <h2 className="text-sm font-semibold text-(--color-text-primary)">Canaux</h2>
              <button
                onClick={startNew}
                className="rounded-md p-1 text-(--color-text-placeholder) transition-colors hover:bg-(--color-bg-button) hover:text-(--color-text-primary)"
                title="Ajouter un canal"
                aria-label="Ajouter un canal Telegram"
              >
                <Plus size={16} weight="bold" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {channels.map((c) => (
                <button
                  key={c.id}
                  data-testid={`canal-item-${c.id}`}
                  onClick={() => selectChannel(c)}
                  className={[
                    'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    selectedId === c.id
                      ? 'bg-(--color-accent-bg) font-medium text-(--color-text-primary)'
                      : 'text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)',
                  ].join(' ')}
                >
                  <span className="truncate">{c.label}</span>
                  <span
                    className={[
                      'h-2 w-2 shrink-0 rounded-full',
                      c.enabled ? 'bg-(--color-success-text)' : 'bg-(--color-text-placeholder)',
                    ].join(' ')}
                    title={c.enabled ? 'Actif' : 'Inactif'}
                    aria-hidden="true"
                  />
                </button>
              ))}
              {channels.length === 0 && selectedId !== 'new' && (
                <p className="px-3 py-2 text-xs text-(--color-text-placeholder)">
                  Aucun canal configuré.
                </p>
              )}
              {selectedId === 'new' && (
                <div className="rounded-md bg-(--color-accent-bg) px-3 py-2 text-sm font-medium text-(--color-text-placeholder)">
                  Nouveau canal…
                </div>
              )}
            </nav>
          </aside>

          <div className="flex-1 overflow-y-auto border-l border-(--color-border)">
            {!showPanel ? (
              <div className="flex h-full items-center justify-center text-sm text-(--color-text-placeholder)">
                Sélectionnez un canal ou ajoutez-en un nouveau
              </div>
            ) : (
              <div className="p-6">
                <div className="mb-4 max-w-sm">
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="canal-label"
                  >
                    Nom du canal <span className="text-(--color-danger-text)">*</span>
                  </label>
                  <input
                    id="canal-label"
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Ex : Citations du matin"
                    aria-label="Nom du canal"
                    className={inputClass}
                  />
                  {errors.label && (
                    <p className="mt-1 text-xs text-(--color-danger-text)">{errors.label}</p>
                  )}
                </div>

                <div className="mb-4 max-w-sm">
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="canal-chat-id"
                  >
                    Identifiant du canal (chat_id){' '}
                    <span className="text-(--color-danger-text)">*</span>
                  </label>
                  <input
                    id="canal-chat-id"
                    type="text"
                    inputMode="numeric"
                    value={form.chat_id}
                    onChange={(e) => setForm((f) => ({ ...f, chat_id: e.target.value }))}
                    placeholder="Ex : -1001234567890"
                    aria-label="Identifiant du canal Telegram"
                    className={inputClass}
                  />
                  {errors.chat_id && (
                    <p className="mt-1 text-xs text-(--color-danger-text)">{errors.chat_id}</p>
                  )}
                </div>

                <div className="mb-4 max-w-sm">
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="canal-oeuvre"
                  >
                    Œuvre rattachée
                  </label>
                  <select
                    id="canal-oeuvre"
                    value={form.oeuvre_id}
                    onChange={(e) => setForm((f) => ({ ...f, oeuvre_id: e.target.value }))}
                    aria-label="Œuvre rattachée au canal"
                    className={inputClass}
                  >
                    <option value="">— Aucune —</option>
                    {oeuvres.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4 max-w-sm">
                  <label
                    className="mb-1 block text-sm font-medium text-(--color-text-primary)"
                    htmlFor="canal-frequence"
                  >
                    Délai minimum entre deux collectes (heures)
                  </label>
                  <input
                    id="canal-frequence"
                    type="number"
                    min={0}
                    max={255}
                    value={form.run_every_hours}
                    onChange={(e) => setForm((f) => ({ ...f, run_every_hours: e.target.value }))}
                    aria-label="Délai minimum entre deux collectes en heures"
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-(--color-text-placeholder)">
                    Le canal n’est re-collecté qu’une fois ce délai écoulé, lors du passage du
                    collecteur (planifié côté serveur).
                  </p>
                  {errors.run_every_hours && (
                    <p className="mt-1 text-xs text-(--color-danger-text)">
                      {errors.run_every_hours}
                    </p>
                  )}
                </div>

                <div className="mb-6 max-w-sm">
                  <label className="flex items-center gap-2 text-sm font-medium text-(--color-text-primary)">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                      className="h-4 w-4 rounded border-(--color-border)"
                    />
                    Canal actif (collecté automatiquement)
                  </label>
                </div>

                {selected && (
                  <div className="mb-6 max-w-sm rounded-md border border-(--color-border) bg-(--color-bg-field) p-4 text-sm">
                    <h3 className="mb-2 font-semibold text-(--color-text-primary)">Diagnostic</h3>
                    <p className="text-(--color-text-secondary)">
                      Dernière collecte : {formatDate(selected.last_run_at)}
                    </p>
                    <p className="mt-1 text-(--color-text-secondary)">
                      Dernière erreur :{' '}
                      {selected.last_error ? (
                        <span className="text-(--color-danger-text)">{selected.last_error}</span>
                      ) : (
                        'Aucune'
                      )}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-(--color-border) pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-md bg-(--color-action) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  {typeof selectedId === 'number' && (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 text-sm text-(--color-danger-text) hover:underline"
                    >
                      <Trash size={14} aria-hidden="true" />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
