# T15 — Éditeur Markdown riche (Milkdown) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer un composant éditeur Markdown WYSIWYG réutilisable (Milkdown), une page « labo » pour le manipuler, et un test automatique de fidélité de l'aller-retour Markdown — prototype validant le choix de T15.

**Architecture:** Un composant `MarkdownEditor` encapsule Milkdown/Crepe derrière une interface propre `value`/`onChange` (Markdown en entrée, Markdown en sortie). Une barre d'outils complémentaire et une bascule source/WYSIWYG l'entourent. Une page labo affiche l'éditeur à côté d'un panneau « source Markdown » en direct. La fidélité de l'aller-retour est garantie par un module Markdown pur (remark) testé unitairement.

**Tech Stack:** React 19 + TypeScript + Vite 8 + Tailwind 4 + Vitest 4 ; Milkdown (`@milkdown/crepe`, `@milkdown/kit`) ; remark (`remark`, `remark-gfm`) ; Phosphor Icons ; React Router 8.

## Global Constraints

- **Markdown = donnée-maître** : CommonMark + tableaux GFM ; aller-retour **sans perte** (idempotence).
- **Images par référence uniquement** : `![alt](chemin)` (+ alt + légende) ; **aucune mécanique d'upload, aucune référence à la médiathèque** dans le code ou les commentaires.
- **Licence** : ne tirer que des paquets MIT/Apache (Milkdown = MIT, remark = MIT).
- **Stack imposée** : exports nommés, types explicites (`type XProps = {...}`), classes Tailwind avec variables CSS custom (`bg-(--color-bg-card)`, `border-(--color-border)`, etc.), icônes Phosphor avec `aria-hidden`/`aria-label`.
- **Mobile** : barre d'outils compacte à défilement horizontal, zone d'édition utilisable en fenêtre étroite.
- **Encapsulation** : aucun import de `@milkdown/*` en dehors de `src/components/MarkdownEditor.tsx` (et ses sous-fichiers `src/components/markdown/`). La page labo ne consomme que les props de `MarkdownEditor`.
- **jsdom ne fait pas tourner ProseMirror** : aucun test Vitest ne monte l'éditeur Milkdown ; les tests DOM se limitent à la page labo en montant un faux `MarkdownEditor` (mock). Le test de fidélité porte sur le module remark pur.
- **Commits** : convention projet — **committer uniquement sur demande explicite du chef de projet**. Les étapes « Commit » ci-dessous sont préparées mais exécutées seulement après feu vert (les regrouper).
- **Gestionnaire de paquets** : `pnpm`. **Vérifier le chemin d'import exact des utilitaires Milkdown** contre la version réellement installée et ajuster si l'import échoue (bibliothèque à évolution rapide).

---

## Structure des fichiers

- `src/components/markdown/roundtrip.ts` — module Markdown pur (processeur remark + helper d'aller-retour). **Seul** garant testable de la fidélité.
- `src/components/markdown/__tests__/roundtrip.test.ts` — test Vitest de fidélité.
- `src/components/markdown/sampleDoc.ts` — document « piégeux » partagé (test + labo).
- `src/components/MarkdownEditor.tsx` — composant éditeur (encapsule Crepe + barre d'outils + bascule source).
- `src/components/MarkdownToolbar.tsx` — boutons complémentaires (emoji, image, note de bas de page, reset).
- `src/features/admin/LaboEditeurPage.tsx` — page labo (éditeur + panneau source).
- `src/features/admin/__tests__/LaboEditeurPage.test.tsx` — test page labo (avec `MarkdownEditor` mocké).
- `src/App.tsx` — ajout de la route `admin/labo-editeur`.
- `package.json` — ajout des dépendances.

---

## Task 1 : Module Markdown pur + test de fidélité (aller-retour)

**Files:**
- Create: `src/components/markdown/sampleDoc.ts`
- Create: `src/components/markdown/roundtrip.ts`
- Test: `src/components/markdown/__tests__/roundtrip.test.ts`
- Modify: `package.json` (dépendance `remark`)

**Interfaces:**
- Produces: `SAMPLE_MARKDOWN: string` (document piégeux) ; `roundtripMarkdown(md: string): string` (normalise via remark+gfm) ; `serializeFromTree`/`parseToTree` non exposés (détail interne).

- [ ] **Step 1 : Ajouter la dépendance `remark`**

Run: `pnpm add remark`
Note : `remark-gfm@4.0.1` est déjà présent. `remark` apporte `remark-parse` + `remark-stringify`.
Expected : `package.json` liste `remark` ; `pnpm-lock.yaml` mis à jour.

- [ ] **Step 2 : Créer le document piégeux**

Create `src/components/markdown/sampleDoc.ts` :

```ts
// Document de référence couvrant les cas piégeux exigés par T15.
// Sert au test de fidélité ET de contenu initial de la page labo.
export const SAMPLE_MARKDOWN = `# Titre H1

Texte avec **gras**, *italique* et un [lien](https://example.org).

## Titre H2

- item un
- item deux
  - sous-item

1. premier
2. second

> Une citation sur une ligne.

| Colonne A | Colonne B |
| --------- | --------- |
| a1        | b1        |
| a2        | b2        |

![texte alternatif](images/exemple.png)

Une phrase avec une note de bas de page.[^note]

Un emoji littéral : 😀

[^note]: Contenu de la note de bas de page.
`
```

- [ ] **Step 3 : Écrire le test de fidélité (qui doit échouer)**

Create `src/components/markdown/__tests__/roundtrip.test.ts` :

```ts
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
```

- [ ] **Step 4 : Lancer le test, vérifier l'échec**

Run: `pnpm test -- roundtrip`
Expected : FAIL — `roundtripMarkdown` introuvable (module non créé).

- [ ] **Step 5 : Implémenter le module Markdown pur**

Create `src/components/markdown/roundtrip.ts` :

```ts
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'

// Processeur partagé : CommonMark + GFM (tableaux, notes de bas de page).
// remark = remark-parse + remark-stringify ; remark-gfm ajoute tables/footnotes.
const processor = remark().use(remarkGfm)

/**
 * Normalise un Markdown en le faisant passer dans le processeur remark.
 * Garantit l'invariant de fidélité : roundtrip(roundtrip(x)) === roundtrip(x).
 */
export function roundtripMarkdown(md: string): string {
  return String(processor.processSync(md))
}
```

- [ ] **Step 6 : Lancer le test, vérifier le succès**

Run: `pnpm test -- roundtrip`
Expected : PASS (2 tests).

Si une assertion de contenu échoue à cause de la normalisation remark (ex. `*` vs `_`, espacement de tableau), **ajuster l'assertion** pour refléter la forme normalisée stable — l'invariant qui compte est l'idempotence, pas l'égalité au texte d'origine.

- [ ] **Step 7 : Typecheck + lint**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected : 0 erreur.

- [ ] **Step 8 : Commit (après feu vert)**

```bash
git add package.json pnpm-lock.yaml src/components/markdown/
git commit -m "feat(T15): module roundtrip Markdown (remark+gfm) + test de fidélité"
```

---

## Task 2 : Composant `MarkdownEditor` (cœur Crepe, interface value/onChange)

**Files:**
- Create: `src/components/MarkdownEditor.tsx`
- Modify: `package.json` (dépendances Milkdown)

**Interfaces:**
- Consumes: rien des tâches précédentes.
- Produces: `MarkdownEditor` (export nommé) avec props
  `type MarkdownEditorProps = { value: string; onChange: (markdown: string) => void; readOnly?: boolean }`.
  Expose un handle impératif via `ref` (`MarkdownEditorHandle = { insertText(text: string): void; reset(): void; getMarkdown(): string }`) pour la barre d'outils complémentaire (Task 4) et la bascule source (Task 3).

- [ ] **Step 1 : Ajouter les dépendances Milkdown**

Run: `pnpm add @milkdown/crepe @milkdown/kit`
Expected : `package.json` liste `@milkdown/crepe` et `@milkdown/kit`.

- [ ] **Step 2 : Implémenter `MarkdownEditor` (montage manuel de Crepe)**

Create `src/components/MarkdownEditor.tsx` :

```tsx
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Crepe } from '@milkdown/crepe'
import { insert, replaceAll } from '@milkdown/kit/utils'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frappe.css'

export type MarkdownEditorHandle = {
  insertText: (text: string) => void
  reset: () => void
  getMarkdown: () => string
}

export type MarkdownEditorProps = {
  value: string
  onChange: (markdown: string) => void
  readOnly?: boolean
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor({ value, onChange, readOnly = false }, ref) {
    const rootRef = useRef<HTMLDivElement>(null)
    const crepeRef = useRef<Crepe | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    // Montage unique : Crepe est non contrôlé (defaultValue figé au montage).
    useEffect(() => {
      if (!rootRef.current) return
      const crepe = new Crepe({ root: rootRef.current, defaultValue: value })
      crepeRef.current = crepe
      crepe.create().then(() => {
        crepe.setReadonly(readOnly)
        crepe.on((listener) => {
          listener.markdownUpdated((_ctx, markdown) => onChangeRef.current(markdown))
        })
      })
      return () => {
        crepe.destroy()
        crepeRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      crepeRef.current?.setReadonly(readOnly)
    }, [readOnly])

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        crepeRef.current?.editor.action(insert(text))
      },
      reset: () => {
        crepeRef.current?.editor.action(replaceAll(''))
      },
      getMarkdown: () => crepeRef.current?.getMarkdown() ?? '',
    }))

    return <div ref={rootRef} className="milkdown-host min-h-[300px]" />
  },
)
```

**Vérifications à l'exécution :**
- Confirmer les chemins d'import des thèmes Crepe (`@milkdown/crepe/theme/...`) et des utilitaires (`@milkdown/kit/utils` → sinon `@milkdown/utils`) contre la version installée ; ajuster si l'import échoue.
- Confirmer que `crepe.editor.action(...)` est accessible ; sinon, conserver une référence au sous-`Editor` exposé par Crepe.

- [ ] **Step 3 : Vérifier la compilation (pas de test DOM — jsdom incompatible ProseMirror)**

Run: `pnpm tsc --noEmit && pnpm build`
Expected : build OK. (La validation fonctionnelle se fera sur la page labo en Task 5.)

- [ ] **Step 4 : Commit (après feu vert)**

```bash
git add package.json pnpm-lock.yaml src/components/MarkdownEditor.tsx
git commit -m "feat(T15): composant MarkdownEditor (Crepe encapsulé, value/onChange)"
```

---

## Task 3 : Bascule source ⇄ WYSIWYG dans `MarkdownEditor`

**Files:**
- Modify: `src/components/MarkdownEditor.tsx`

**Interfaces:**
- Produces: comportement interne ; ajoute un état `mode: 'wysiwyg' | 'source'` et un bouton de bascule. En mode source, un `<textarea>` édite le Markdown brut ; au retour WYSIWYG, le contenu est ré-injecté via `replaceAll`.

- [ ] **Step 1 : Ajouter l'état de mode et le textarea source**

Modifier `MarkdownEditor.tsx` : introduire un état local et une valeur source synchronisée.

```tsx
import { useState } from 'react'
import { Code, Eye } from '@phosphor-icons/react'
// ... dans le composant :
const [mode, setMode] = useState<'wysiwyg' | 'source'>('wysiwyg')
const [sourceText, setSourceText] = useState(value)

function toEditMode(next: 'wysiwyg' | 'source') {
  if (next === 'source') {
    setSourceText(crepeRef.current?.getMarkdown() ?? sourceText)
  } else {
    crepeRef.current?.editor.action(replaceAll(sourceText))
    onChangeRef.current(sourceText)
  }
  setMode(next)
}
```

- [ ] **Step 2 : Rendre le bouton de bascule + les deux vues**

Remplacer le `return` de `MarkdownEditor` par :

```tsx
return (
  <div className="rounded-lg border border-(--color-border) bg-(--color-bg-card)">
    <div className="flex items-center justify-end border-b border-(--color-border) p-2">
      <button
        type="button"
        onClick={() => toEditMode(mode === 'wysiwyg' ? 'source' : 'wysiwyg')}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-(--color-action-hover)"
        aria-label={mode === 'wysiwyg' ? 'Afficher la source Markdown' : 'Afficher l’éditeur visuel'}
      >
        {mode === 'wysiwyg'
          ? <><Code className="h-4 w-4" aria-hidden="true" /> Source</>
          : <><Eye className="h-4 w-4" aria-hidden="true" /> Visuel</>}
      </button>
    </div>
    <div className={mode === 'wysiwyg' ? 'block' : 'hidden'}>
      <div ref={rootRef} className="milkdown-host min-h-[300px]" />
    </div>
    {mode === 'source' && (
      <textarea
        className="min-h-[300px] w-full resize-y bg-(--color-bg-card) p-3 font-mono text-sm text-(--color-text-primary)"
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        aria-label="Source Markdown"
      />
    )}
  </div>
)
```

Garder le `<div ref={rootRef}>` **toujours monté** (caché en CSS, pas démonté) pour ne pas recréer Crepe à chaque bascule.

- [ ] **Step 3 : Typecheck + lint + build**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected : 0 erreur, build OK.

- [ ] **Step 4 : Commit (après feu vert)**

```bash
git add src/components/MarkdownEditor.tsx
git commit -m "feat(T15): bascule source ⇄ WYSIWYG dans MarkdownEditor"
```

---

## Task 4 : Barre d'outils complémentaire (emoji, image par référence, note de bas de page, reset)

**Files:**
- Create: `src/components/MarkdownToolbar.tsx`
- Modify: `src/components/MarkdownEditor.tsx` (insérer la toolbar au-dessus de l'éditeur)

**Interfaces:**
- Consumes: `MarkdownEditorHandle` (Task 2 : `insertText`, `reset`).
- Produces: `MarkdownToolbar` (export nommé) avec props
  `type MarkdownToolbarProps = { onInsert: (text: string) => void; onReset: () => void }`.

Note : gras/italique/titres/listes/citation/liens/tableaux/annuler-rétablir sont fournis nativement par la barre Crepe. Cette toolbar **complète** ce que Crepe ne couvre pas couramment : emoji, image avec légende, note de bas de page, reset.

- [ ] **Step 1 : Implémenter `MarkdownToolbar`**

Create `src/components/MarkdownToolbar.tsx` :

```tsx
import { useState } from 'react'
import { Smiley, Image as ImageIcon, Note, ArrowCounterClockwise } from '@phosphor-icons/react'

const EMOJIS = ['😀', '😊', '🙏', '❤️', '✨', '🔥', '✅', '⚠️', '📖', '🕊️']

export type MarkdownToolbarProps = {
  onInsert: (text: string) => void
  onReset: () => void
}

export function MarkdownToolbar({ onInsert, onReset }: MarkdownToolbarProps) {
  const [emojiOpen, setEmojiOpen] = useState(false)

  function insertImage() {
    const path = window.prompt('Chemin de l’image (ex. images/exemple.png)')
    if (!path) return
    const alt = window.prompt('Texte alternatif') ?? ''
    const caption = window.prompt('Légende (optionnelle)') ?? ''
    const md = caption ? `![${alt}](${path})\n\n*${caption}*\n\n` : `![${alt}](${path})\n\n`
    onInsert(md)
  }

  function insertFootnote() {
    onInsert('[^note]')
    onInsert('\n\n[^note]: Texte de la note.\n')
  }

  return (
    <div className="flex flex-nowrap items-center gap-1 overflow-x-auto border-b border-(--color-border) p-2">
      <div className="relative">
        <button type="button" onClick={() => setEmojiOpen((o) => !o)}
          className="rounded p-1 hover:bg-(--color-action-hover)" aria-label="Insérer un emoji">
          <Smiley className="h-5 w-5" aria-hidden="true" />
        </button>
        {emojiOpen && (
          <div className="absolute z-10 mt-1 flex flex-wrap gap-1 rounded border border-(--color-border) bg-(--color-bg-card) p-2 shadow-md">
            {EMOJIS.map((e) => (
              <button key={e} type="button" className="rounded p-1 text-lg hover:bg-(--color-action-hover)"
                onClick={() => { onInsert(e); setEmojiOpen(false) }} aria-label={`Emoji ${e}`}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" onClick={insertImage}
        className="rounded p-1 hover:bg-(--color-action-hover)" aria-label="Insérer une image par référence">
        <ImageIcon className="h-5 w-5" aria-hidden="true" />
      </button>
      <button type="button" onClick={insertFootnote}
        className="rounded p-1 hover:bg-(--color-action-hover)" aria-label="Insérer une note de bas de page">
        <Note className="h-5 w-5" aria-hidden="true" />
      </button>
      <button type="button" onClick={onReset}
        className="rounded p-1 hover:bg-(--color-action-hover)" aria-label="Réinitialiser l’éditeur">
        <ArrowCounterClockwise className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2 : Brancher la toolbar dans `MarkdownEditor`**

Dans `MarkdownEditor.tsx`, au-dessus de la zone d'édition (dans le conteneur, sous la barre de bascule), insérer :

```tsx
import { MarkdownToolbar } from './MarkdownToolbar'
// ... dans le JSX, avant le <div ref={rootRef}> :
{mode === 'wysiwyg' && (
  <MarkdownToolbar
    onInsert={(text) => crepeRef.current?.editor.action(insert(text))}
    onReset={() => crepeRef.current?.editor.action(replaceAll(''))}
  />
)}
```

- [ ] **Step 3 : Typecheck + lint + build**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected : 0 erreur, build OK.

- [ ] **Step 4 : Vérification fonctionnelle des notes de bas de page (à l'exécution)**

Au lancement de la page labo (Task 5) : insérer une note de bas de page et confirmer que Crepe la **rend** correctement. Si le rendu visuel n'est pas géré par Crepe, **documenter le contournement** retenu (édition en mode source, le `roundtripMarkdown` préservant déjà la syntaxe) directement dans la note de choix. Idem emoji par raccourci `:smile:` (ici on insère l'emoji unicode, toujours fidèle).

- [ ] **Step 5 : Commit (après feu vert)**

```bash
git add src/components/MarkdownToolbar.tsx src/components/MarkdownEditor.tsx
git commit -m "feat(T15): toolbar complémentaire (emoji, image, note, reset)"
```

---

## Task 5 : Page labo + route + panneau source en direct

**Files:**
- Create: `src/features/admin/LaboEditeurPage.tsx`
- Create: `src/features/admin/__tests__/LaboEditeurPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `MarkdownEditor` (Task 2–4), `SAMPLE_MARKDOWN` (Task 1).
- Produces: route `admin/labo-editeur` rendant `LaboEditeurPage`.

- [ ] **Step 1 : Écrire le test de la page labo (qui doit échouer)**

Le `MarkdownEditor` réel embarque Milkdown/ProseMirror → on le **mocke** pour tester la page en jsdom.

Create `src/features/admin/__tests__/LaboEditeurPage.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/MarkdownEditor', () => ({
  MarkdownEditor: ({ value }: { value: string }) => <div data-testid="editor-stub">{value}</div>,
}))

import { LaboEditeurPage } from '../LaboEditeurPage'

describe('LaboEditeurPage', () => {
  it('affiche le titre, l’éditeur et le panneau source', () => {
    render(<LaboEditeurPage />)
    expect(screen.getByRole('heading', { name: /labo éditeur/i })).toBeInTheDocument()
    expect(screen.getByTestId('editor-stub')).toBeInTheDocument()
    expect(screen.getByText(/source markdown/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `pnpm test -- LaboEditeurPage`
Expected : FAIL — `LaboEditeurPage` introuvable.

- [ ] **Step 3 : Implémenter la page labo**

Create `src/features/admin/LaboEditeurPage.tsx` :

```tsx
import { useState } from 'react'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { SAMPLE_MARKDOWN } from '@/components/markdown/sampleDoc'

export function LaboEditeurPage() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN)

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 text-xl font-semibold text-(--color-text-primary)">Labo éditeur Markdown</h1>
      <div className="flex flex-col gap-4 lg:flex-row">
        <section className="flex-1">
          <MarkdownEditor value={markdown} onChange={setMarkdown} />
        </section>
        <section className="flex-1">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-(--color-text-secondary)">
            Source Markdown
          </h2>
          <pre className="max-h-[600px] overflow-auto rounded-lg border border-(--color-border) bg-(--color-bg-card) p-3 text-xs whitespace-pre-wrap text-(--color-text-primary)">
            {markdown}
          </pre>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `pnpm test -- LaboEditeurPage`
Expected : PASS.

- [ ] **Step 5 : Déclarer la route dans `src/App.tsx`**

Dans le bloc `<Route path="admin" element={<RequireAdmin />}>`, ajouter après la route `roles` :

```tsx
<Route path="labo-editeur" element={<LaboEditeurPage />} />
```

Et l'import en tête de fichier :

```tsx
import { LaboEditeurPage } from '@/features/admin/LaboEditeurPage'
```

- [ ] **Step 6 : Typecheck + lint + build**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected : 0 erreur, build OK.

- [ ] **Step 7 : Commit (après feu vert)**

```bash
git add src/features/admin/LaboEditeurPage.tsx src/features/admin/__tests__/LaboEditeurPage.test.tsx src/App.tsx
git commit -m "feat(T15): page labo éditeur + route admin/labo-editeur"
```

---

## Task 6 : Finitions mobile + recette manuelle complète

**Files:**
- Modify: `src/index.css` (styles d'intégration Milkdown si nécessaire)
- Modify: `src/components/MarkdownEditor.tsx` (ajustements responsive)

**Interfaces:** aucune nouvelle interface ; finitions visuelles + validation.

- [ ] **Step 1 : Vérifier le rendu mobile de la barre d'outils**

S'assurer que les deux barres (bascule + `MarkdownToolbar`) utilisent `flex-nowrap overflow-x-auto` pour défiler horizontalement sans casser la mise en page en fenêtre étroite. Ajuster les classes si débordement vertical.

- [ ] **Step 2 : Intégration visuelle Milkdown / thème**

Si le thème Crepe entre en conflit avec le fond de l'app, ajouter dans `src/index.css` une règle de cadrage minimale :

```css
.milkdown-host .milkdown {
  background: var(--color-bg-card);
}
.milkdown-host .ProseMirror {
  min-height: 280px;
  padding: 0.75rem;
}
```

- [ ] **Step 3 : Recette manuelle (dev server)**

Run: `pnpm dev`, se connecter en admin, ouvrir `/admin/labo-editeur`. Vérifier point par point :
1. Frappe de texte → le panneau « Source Markdown » se met à jour en direct.
2. Boutons natifs Crepe : gras, italique, titres H1–H4, listes, citation, lien, **tableau** (édition visuelle add/remove), annuler/rétablir.
3. Boutons complémentaires : emoji (palette), image (chemin + alt + légende → `![alt](chemin)`), note de bas de page, reset.
4. **Bascule source** : passage WYSIWYG → source → WYSIWYG sans perte de contenu.
5. **Aller-retour** : copier la source produite, recharger, la recoller → rendu identique.
6. **Fenêtre étroite** (DevTools mobile) : toolbar lisible/défilante, zone d'édition utilisable.
7. Notes de bas de page : rendu OK ou contournement documenté (cf. Task 4 Step 4).

- [ ] **Step 4 : Gate qualité finale**

Run: `pnpm lint && pnpm build && pnpm test`
Expected : tout passe (le test de fidélité `roundtrip` + le test `LaboEditeurPage`).

- [ ] **Step 5 : Mettre à jour la note de choix + cocher T15**

- Reporter dans `docs/superpowers/specs/2026-06-26-t15-editeur-markdown-design.md` le résultat de la vérification notes/emoji (et tout contournement).
- Cocher T15 dans `docs/1-trame_execution-lumosphere.md` **uniquement après validation explicite** du chef de projet.

- [ ] **Step 6 : Commit (après feu vert)**

```bash
git add src/index.css src/components/MarkdownEditor.tsx docs/
git commit -m "feat(T15): finitions mobile éditeur + recette + note de choix mise à jour"
```

---

## Auto-revue (couverture du spec)

- Aller-retour sans perte → Task 1 (test idempotence + préservation). ✓
- WYSIWYG type Typora → Task 2 (Crepe). ✓
- Bascule source → Task 3. ✓
- Toolbar complète (gras/italique/titres/listes/citation/liens/tableaux/undo-redo natifs Crepe ; emoji/image/note/reset → Task 4). ✓
- Image par référence (alt + légende + chemin, sans upload ni médiathèque) → Task 4 Step 1. ✓
- Page labo / prototype cliquable → Task 5. ✓
- Responsive mobile → Task 6. ✓
- Encapsulation (Milkdown confiné à `MarkdownEditor`/`markdown/`) → Tasks 2–4. ✓
- Risques notes/emoji signalés + plan de contournement → Task 4 Step 4, Task 6 Step 3/5. ✓
