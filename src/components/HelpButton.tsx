import { useState } from 'react'
import { useLocation } from 'react-router'
import * as Dialog from '@radix-ui/react-dialog'
import { Question, Spinner, X } from '@phosphor-icons/react'

type HelpEntry = { file: string; title: string }

const HELP_MAP: Array<{ test: (p: string) => boolean; entry: HelpEntry }> = [
  { test: (p) => p === '/', entry: { file: 'accueil.html', title: 'Accueil' } },
  { test: (p) => p === '/login', entry: { file: 'login.html', title: 'Connexion' } },
  {
    test: (p) => p.startsWith('/atelier/lot/'),
    entry: { file: 'atelier-lot.html', title: 'Détail du lot' },
  },
  { test: (p) => p === '/atelier', entry: { file: 'atelier.html', title: 'Atelier' } },
  { test: (p) => p === '/admin/ia', entry: { file: 'admin-ia.html', title: 'Catalogue IA' } },
  {
    test: (p) => p === '/admin/utilisateurs',
    entry: { file: 'admin-utilisateurs.html', title: 'Utilisateurs' },
  },
  {
    test: (p) => p === '/admin/roles',
    entry: { file: 'admin-roles.html', title: 'Accès par rôle' },
  },
  { test: (p) => p === '/admin/auteurs', entry: { file: 'admin-auteurs.html', title: 'Auteurs' } },
  { test: (p) => p === '/admin/oeuvres', entry: { file: 'admin-oeuvres.html', title: 'Œuvres' } },
  { test: (p) => p === '/admin/sources', entry: { file: 'admin-sources.html', title: 'Sources' } },
  { test: (p) => p === '/admin/themes', entry: { file: 'admin-themes.html', title: 'Thèmes' } },
  {
    test: (p) => p === '/admin/mots-cles',
    entry: { file: 'admin-mots-cles.html', title: 'Mots-clés' },
  },
  { test: (p) => p === '/admin/etats', entry: { file: 'admin-etats.html', title: 'États' } },
  { test: (p) => p === '/admin/emojis', entry: { file: 'admin-emojis.html', title: 'Emojis' } },
  {
    test: (p) => p === '/admin/citations',
    entry: { file: 'admin-citations.html', title: 'Citations' },
  },
]

function getHelpEntry(pathname: string): HelpEntry | null {
  return HELP_MAP.find(({ test }) => test(pathname))?.entry ?? null
}

const CONTENT_CLASS = [
  '[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-(--color-text-primary)',
  '[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-(--color-text-primary)',
  '[&_p]:mt-2 [&_p:first-child]:mt-0',
  '[&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:mt-1',
  '[&_strong]:font-semibold',
  '[&_em]:italic [&_em]:text-(--color-text-secondary)',
  '[&_code]:rounded [&_code]:bg-(--color-bg-field) [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs',
  '[&_pre]:mt-3 [&_pre]:rounded [&_pre]:bg-(--color-bg-field) [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto',
  '[&_hr]:my-4 [&_hr]:border-(--color-border)',
].join(' ')

export function HelpButton({ showLabel = false }: { showLabel?: boolean }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const entry = getHelpEntry(pathname)

  async function handleOpen() {
    setHtml(null)
    setOpen(true)
    if (!entry) return
    setLoading(true)
    try {
      const res = await fetch(`/help/${entry.file}`)
      if (!res.ok) throw new Error()
      setHtml(await res.text())
    } catch {
      // html reste null → message générique affiché
    } finally {
      setLoading(false)
    }
  }

  const title = entry ? `Aide — ${entry.title}` : 'Aide'

  const btnClass = showLabel
    ? 'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors'
    : 'rounded-md p-2 text-(--color-icon-header) hover:bg-(--color-bg-button) transition-colors'

  return (
    <>
      <button type="button" onClick={handleOpen} aria-label="Aide" className={btnClass}>
        <Question size={18} aria-hidden="true" />
        {showLabel && <span>Aide</span>}
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex w-[min(90vw,32rem)] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-(--color-bg-card) shadow-lg">
            <div className="flex shrink-0 items-center justify-between border-b border-(--color-border) px-5 py-4">
              <Dialog.Title className="text-base font-bold text-(--color-text-primary)">
                {title}
              </Dialog.Title>
              <Dialog.Close className="rounded-md p-1 text-(--color-text-secondary) hover:bg-(--color-bg-button) transition-colors">
                <X size={18} aria-hidden="true" />
              </Dialog.Close>
            </div>

            <div
              className={`overflow-y-auto px-5 py-4 text-sm text-(--color-text-primary) ${CONTENT_CLASS}`}
            >
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner
                    size={24}
                    className="animate-spin text-(--color-accent)"
                    aria-label="Chargement…"
                  />
                </div>
              ) : html !== null ? (
                <div dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <p className="text-(--color-text-secondary)">
                  Pas d'aide disponible pour cette page.
                </p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
