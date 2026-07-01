# Barre d'outils de l'atelier — exploitable au pouce — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la barre de mise en forme de l'éditeur de lot utilisable au doigt sur mobile — repliée par défaut, dépliable, tenant toujours sur la largeur, avec des boutons qui agissent au curseur (jamais besoin de sélectionner du texte), sans jamais montrer de syntaxe Markdown (`**`, `~`) à l'autrice.

**Architecture :** On garde l'éditeur WYSIWYG existant (Milkdown/Crepe, encapsulé dans `MilkdownEditor.tsx`). On corrige trois bugs de la barre (`MarkdownToolbar.tsx`) : (1) `keepFocus`/`onMouseDown preventDefault` qui tue le `click` sur Android — supprimé, remplacé par un refocus explicite de l'éditeur après chaque commande ; (2) `overflow-hidden` sur la racine qui coupe les menus déroulants — supprimé, remplacé par `flex-wrap` (filet anti-débordement) ; (3) barre qui ne rentre pas — pliage par défaut sur mobile, dépliable via un bouton « Format ». Le mode Source (qui expose le Markdown brut) est réservé au desktop.

**Tech Stack :** React 19 + TypeScript + Tailwind CSS v4 (syntaxe `bg-(--color-*)`), Phosphor Icons, Milkdown/Crepe (ProseMirror + remark). Aucune dépendance nouvelle.

## Global Constraints

- Identifiants techniques en anglais ; libellés d'interface en **français** avec accents corrects (é, è, à, œ…).
- Icônes : **Phosphor uniquement**.
- Tout import `@milkdown/*` reste **confiné** à `src/components/markdown/MilkdownEditor.tsx` (règle d'encapsulation existante). `MarkdownToolbar.tsx` ne connaît que des callbacks.
- Cibles tactiles : boutons ≥ 36 px de côté sur mobile.
- Aucune syntaxe Markdown brute (`**`, `~`, `#`) ne doit être visible par l'autrice sur mobile.
- Qualité avant « terminé » : `pnpm tsc --noEmit` ✓, `pnpm lint` ✓, `pnpm build` ✓ (règle testing.md).
- **Commit et push uniquement sur demande explicite** du chef de projet.
- Branche de travail : `feat/atelier-responsive-mobile` (déjà créée, contient le travail précédent).

## File Structure

- `src/components/markdown/MarkdownToolbar.tsx` — **réécrit** : barre compacte, boutons au curseur, sans `keepFocus`, sans `overflow-hidden`, `flex-wrap`, lien via insertion Markdown. Ne gère PAS le pliage (piloté par le parent).
- `src/components/markdown/MilkdownEditor.tsx` — **modifié** : ajout d'un `focusEditor()` appelé après chaque commande ; en-tête restructuré en deux lignes (ligne 1 = bascule « Format » mobile + bascule « Source » desktop ; ligne 2 = barre compacte pliable) ; état `toolbarOpen` ; suppression du câblage `onToggleLink`.
- `src/components/markdown/types.ts` — **inchangé** (l'interface publique `MarkdownEditorHandle`/`MarkdownEditorProps` ne bouge pas).

Aucun autre fichier n'est touché. Les modifications précédentes déjà en place et validées ne sont PAS reprises ici : marges responsives (`src/index.css`), badges IA « accepter d'un appui » et barre d'actions empilée (`DetailLot.tsx`), masquage du bouton Filtres dans l'atelier (`Header.tsx`).

## Notes de test

Cette tâche est de l'interaction UI dans un éditeur contenteditable : elle ne se prête pas au TDD unitaire (le comportement dépend de ProseMirror et du navigateur). La vérification se fait donc par :
1. contrôles statiques bloquants (`tsc`, `lint`, `build`) ;
2. inspection visuelle Playwright/Chromium avec API mockée (cf. mémoire `reference_inspection-visuelle`), aux deux gabarits : mobile ~360 px **et** desktop ~1280 px.

Le backend PHP :8080 étant absent en local, on mocke l'API pour peupler l'atelier (cf. mémoires `reference_inspection-visuelle` et `project_e2e-flaky-parallele` — vérifier en série, `--workers=1`).

---

### Task 1 : Corriger les bugs d'interaction de la barre (clic Android, menus coupés, débordement)

**Files:**
- Rewrite: `src/components/markdown/MarkdownToolbar.tsx`
- Modify: `src/components/markdown/MilkdownEditor.tsx` (handlers + focusEditor)

**Interfaces:**
- Consumes (de `MilkdownEditor`) : callbacks `onInsert(text: string)`, `onReset()`, `onSetHeading?(level: 0|1|2|3)`, `currentBlockType?: string`, `onToggleStrong?()`, `onToggleEmphasis?()`, `onToggleBulletList?()`, `onToggleBlockquote?()`.
- Produces : `MarkdownToolbar` — composant de barre compacte, sans état de pliage (le pliage est géré par le parent en Task 2). Le prop `onToggleLink` est **supprimé** (le lien passe désormais par `onInsert`).

- [ ] **Step 1 : Réécrire `MarkdownToolbar.tsx`**

Remplacer intégralement le fichier par :

```tsx
import { useState, useRef, useEffect } from 'react'
import {
  Smiley,
  Image as ImageIcon,
  Note,
  ArrowCounterClockwise,
  TextB,
  TextItalic,
  ListBullets,
  Quotes,
  Link,
  DotsThreeOutline,
  CaretDown,
} from '@phosphor-icons/react'

const EMOJIS = ['😀', '😊', '🙏', '❤️', '✨', '🔥', '✅', '⚠️', '📖', '🕊️']

const BLOCK_LABELS: Record<string, string> = {
  paragraph: 'Paragraphe',
  h1: 'Titre 1',
  h2: 'Titre 2',
  h3: 'Titre 3',
}

export type MarkdownToolbarProps = {
  onInsert: (text: string) => void
  onReset: () => void
  onSetHeading?: (level: 0 | 1 | 2 | 3) => void
  currentBlockType?: string
  onToggleStrong?: () => void
  onToggleEmphasis?: () => void
  onToggleBulletList?: () => void
  onToggleBlockquote?: () => void
}

export function MarkdownToolbar({
  onInsert,
  onReset,
  onSetHeading,
  currentBlockType,
  onToggleStrong,
  onToggleEmphasis,
  onToggleBulletList,
  onToggleBlockquote,
}: MarkdownToolbarProps) {
  const [blockOpen, setBlockOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const blockRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  // Fermeture des menus au clic/toucher extérieur.
  useEffect(() => {
    if (!blockOpen && !moreOpen) return
    function onOutside(e: MouseEvent) {
      if (blockRef.current && !blockRef.current.contains(e.target as Node)) setBlockOpen(false)
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
        setEmojiOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [blockOpen, moreOpen])

  function setBlock(level: 0 | 1 | 2 | 3) {
    onSetHeading?.(level)
    setBlockOpen(false)
  }

  function insertImage() {
    setMoreOpen(false)
    const path = window.prompt("Chemin de l'image (ex. images/exemple.png)")
    if (!path) return
    const alt = window.prompt('Texte alternatif') ?? ''
    const caption = window.prompt('Légende (optionnelle)') ?? ''
    const md = caption ? `![${alt}](${path})\n\n*${caption}*\n\n` : `![${alt}](${path})\n\n`
    onInsert(md)
  }

  function insertFootnote() {
    setMoreOpen(false)
    onInsert('texte[^note]\n\n[^note]: Contenu de la note.\n')
  }

  // Lien au curseur : pas besoin de sélectionner du texte au préalable.
  // On demande le libellé puis l'adresse, et on insère un lien Markdown que
  // le moteur parse en nœud « lien » (aucune syntaxe brute visible ensuite).
  function insertLink() {
    const text = window.prompt('Texte du lien') ?? ''
    const href = window.prompt('Adresse du lien (ex. https://…)')
    if (!href) return
    onInsert(`[${text || href}](${href})`)
  }

  // Cible tactile 36px ; PLUS de onMouseDown/preventDefault : celui-ci
  // supprimait le clic synthétisé sur Android Chrome (B/I muets). Les
  // commandes ProseMirror s'appliquent à l'état (view.state) même après le
  // blur, et le parent refocalise l'éditeur juste après.
  const btnCls =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-(--color-bg-button) active:bg-(--color-bg-button)'
  const sep = <div className="mx-0.5 h-5 w-px shrink-0 bg-(--color-border)" aria-hidden="true" />
  const currentLabel = BLOCK_LABELS[currentBlockType ?? 'paragraph'] ?? 'Paragraphe'

  // flex-wrap = filet anti-débordement : si la largeur manque, les boutons
  // passent à la ligne au lieu de déborder ou d'être rognés. PAS d'overflow-hidden
  // (il coupait les menus déroulants positionnés en absolu).
  return (
    <div className="flex w-full flex-wrap items-center gap-1">
      {/* Style de bloc (Paragraphe / Titres) — menu déroulant custom, agit au curseur */}
      {onSetHeading && (
        <div ref={blockRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setBlockOpen((o) => !o)}
            aria-expanded={blockOpen}
            aria-haspopup="listbox"
            className="flex h-9 items-center gap-1 rounded-md border border-(--color-border) bg-(--color-bg-field) px-2 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)"
          >
            <span className="max-w-[80px] truncate">{currentLabel}</span>
            <CaretDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
          </button>

          {blockOpen && (
            <div
              role="listbox"
              className="absolute left-0 top-full z-20 mt-1 min-w-[130px] rounded-lg border border-(--color-border) bg-(--color-bg-card) py-1 shadow-lg"
            >
              {(
                [
                  ['paragraph', 'Paragraphe', 0],
                  ['h1', 'Titre 1', 1],
                  ['h2', 'Titre 2', 2],
                  ['h3', 'Titre 3', 3],
                ] as const
              ).map(([key, label, level]) => (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={currentBlockType === key}
                  onClick={() => setBlock(level)}
                  className={`flex w-full items-center px-3 py-2.5 text-sm hover:bg-(--color-bg-button) ${
                    currentBlockType === key
                      ? 'font-semibold text-(--color-accent-ink)'
                      : 'text-(--color-text-primary)'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {sep}

      {/* Marques et blocs — agissent au curseur */}
      {onToggleStrong && (
        <button
          type="button"
          onClick={onToggleStrong}
          className={btnCls}
          aria-label="Gras"
          title="Gras"
        >
          <TextB className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {onToggleEmphasis && (
        <button
          type="button"
          onClick={onToggleEmphasis}
          className={btnCls}
          aria-label="Italique"
          title="Italique"
        >
          <TextItalic className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {onToggleBulletList && (
        <button
          type="button"
          onClick={onToggleBulletList}
          className={btnCls}
          aria-label="Liste à puces"
          title="Liste à puces"
        >
          <ListBullets className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {onToggleBlockquote && (
        <button
          type="button"
          onClick={onToggleBlockquote}
          className={btnCls}
          aria-label="Citation"
          title="Citation"
        >
          <Quotes className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        onClick={insertLink}
        className={btnCls}
        aria-label="Lien"
        title="Lien"
      >
        <Link className="h-4 w-4" aria-hidden="true" />
      </button>

      {sep}

      {/* Menu « … » : insertions secondaires + réinitialisation */}
      <div ref={moreRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className={btnCls}
          aria-label="Plus d'options"
          title="Plus d'options"
          aria-expanded={moreOpen}
        >
          <DotsThreeOutline className="h-4 w-4" aria-hidden="true" />
        </button>

        {moreOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[190px] rounded-lg border border-(--color-border) bg-(--color-bg-card) py-1 shadow-lg">
            {/* Emoji */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setEmojiOpen((o) => !o)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)"
              >
                <Smiley className="h-4 w-4 shrink-0" aria-hidden="true" />
                Emoji
              </button>
              {emojiOpen && (
                <div className="absolute right-full top-0 z-30 mr-1 flex w-[180px] flex-wrap gap-1 rounded-lg border border-(--color-border) bg-(--color-bg-card) p-2 shadow-md">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className="h-9 w-9 rounded text-xl hover:bg-(--color-bg-button)"
                      onClick={() => {
                        onInsert(e)
                        setEmojiOpen(false)
                        setMoreOpen(false)
                      }}
                      aria-label={`Emoji ${e}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image */}
            <button
              type="button"
              onClick={insertImage}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)"
            >
              <ImageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              Image
            </button>

            {/* Note de bas de page */}
            <button
              type="button"
              onClick={insertFootnote}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-(--color-text-primary) hover:bg-(--color-bg-button)"
            >
              <Note className="h-4 w-4 shrink-0" aria-hidden="true" />
              Note de bas de page
            </button>

            <div className="my-1 border-t border-(--color-border)" />

            {/* Réinitialiser */}
            <button
              type="button"
              onClick={() => {
                onReset()
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-(--color-bg-button) dark:text-red-400"
            >
              <ArrowCounterClockwise className="h-4 w-4 shrink-0" aria-hidden="true" />
              Réinitialiser
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Ajouter `focusEditor()` et refocaliser après chaque commande dans `MilkdownEditor.tsx`**

Supprimer l'import `toggleLinkCommand` (le lien passe désormais par `onInsert`). La ligne d'import devient :

```tsx
import {
  wrapInHeadingCommand,
  turnIntoTextCommand,
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInBulletListCommand,
  wrapInBlockquoteCommand,
} from '@milkdown/kit/preset/commonmark'
```

Juste avant `handleToggleStrong` (actuellement ligne ~53), ajouter le helper de refocus :

```tsx
    // Redonne le focus à l'éditeur après une action de barre d'outils.
    // Nécessaire car les boutons ne bloquent plus le blur (onMouseDown supprimé) :
    // sans ce refocus, le clavier mobile se fermerait après chaque commande.
    const focusEditor = useCallback(() => {
      crepeRef.current?.editor.action((ctx) => ctx.get(editorViewCtx).focus())
    }, [])
```

Remplacer les quatre handlers de marques/blocs (actuellement lignes ~53-67) par des versions qui refocalisent, et **supprimer** `handleToggleLink` (lignes ~69-73) :

```tsx
    const handleToggleStrong = useCallback(() => {
      crepeRef.current?.editor.action(callCommand(toggleStrongCommand.key))
      focusEditor()
    }, [focusEditor])

    const handleToggleEmphasis = useCallback(() => {
      crepeRef.current?.editor.action(callCommand(toggleEmphasisCommand.key))
      focusEditor()
    }, [focusEditor])

    const handleToggleBulletList = useCallback(() => {
      crepeRef.current?.editor.action(callCommand(wrapInBulletListCommand.key))
      focusEditor()
    }, [focusEditor])

    const handleToggleBlockquote = useCallback(() => {
      crepeRef.current?.editor.action(callCommand(wrapInBlockquoteCommand.key))
      focusEditor()
    }, [focusEditor])
```

- [ ] **Step 3 : Contrôles statiques**

Run: `pnpm tsc --noEmit && pnpm lint`
Expected: aucune erreur. (En particulier : plus aucune référence à `toggleLinkCommand` ni à `onToggleLink` ne doit subsister — `tsc` échouerait sinon. La suppression du prop `onToggleLink` côté `MarkdownToolbar` sera cohérente une fois la Task 2 faite ; à ce stade `MilkdownEditor` passe encore `onToggleLink` → l'erreur TS attendue est normale et corrigée en Task 2. Si l'on exécute Task 1 et Task 2 dans le même commit, enchaîner directement.)

> Note d'exécution : Task 1 et Task 2 modifient la même paire de fichiers et sont interdépendantes (le prop `onToggleLink` disparaît des deux côtés). Les implémenter **d'affilée** puis lancer les contrôles statiques une seule fois, à la fin de la Task 2.

- [ ] **Step 4 : Commit** (après Task 2)

Voir Task 2, Step 4.

---

### Task 2 : Barre pliable par défaut sur mobile + mode Source réservé au desktop

**Files:**
- Modify: `src/components/markdown/MilkdownEditor.tsx` (en-tête + état `toolbarOpen`)

**Interfaces:**
- Consumes : `MarkdownToolbar` (Task 1, sans `onToggleLink`).
- Produces : en-tête d'éditeur à deux lignes ; état local `toolbarOpen` (mobile) ; barre visible en permanence sur desktop (`md:`).

- [ ] **Step 1 : Ajouter l'icône `TextAa` et l'état `toolbarOpen`**

Dans l'import Phosphor (actuellement ligne 14 : `import { Code, Eye } from '@phosphor-icons/react'`), ajouter `TextAa` et `CaretDown` :

```tsx
import { Code, Eye, TextAa, CaretDown } from '@phosphor-icons/react'
```

Après la ligne `const [blockType, setBlockType] = useState<string>('paragraph')` (~ligne 35), ajouter :

```tsx
    // Barre de mise en forme repliée par défaut sur mobile (l'autrice lit/corrige
    // le plus souvent ; elle déplie pour mettre en forme). Toujours dépliée sur
    // desktop via les classes `md:` (il y a la place).
    const [toolbarOpen, setToolbarOpen] = useState(false)
```

- [ ] **Step 2 : Restructurer l'en-tête de l'éditeur (bloc `return`)**

Remplacer le bloc en-tête actuel (le `<div className="sticky top-16 …">` … `</div>` fermant, actuellement lignes ~140-182) par la structure à deux lignes suivante :

```tsx
        <div className="sticky top-16 z-10 flex flex-col gap-2 rounded-t-lg border-b border-(--color-border) bg-(--color-bg-card) p-2">
          {/* Ligne 1 : bascule « Format » (mobile) + bascule « Source » (desktop) */}
          <div className="flex items-center justify-between">
            {mode === 'wysiwyg' ? (
              <button
                type="button"
                onClick={() => setToolbarOpen((o) => !o)}
                aria-expanded={toolbarOpen}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-(--color-text-primary) hover:bg-(--color-bg-button) md:hidden"
              >
                <TextAa className="h-4 w-4" aria-hidden="true" />
                Format
                <CaretDown
                  className={`h-3 w-3 opacity-60 transition-transform ${toolbarOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <span className="px-1 text-sm text-(--color-text-secondary)">Source Markdown</span>
            )}

            {/* Bascule Source/Visuel — desktop uniquement : sur mobile l'autrice
                ne doit jamais voir la syntaxe Markdown brute. */}
            <button
              type="button"
              onClick={toggleMode}
              className="ml-auto hidden shrink-0 items-center gap-1 rounded px-2 py-1 text-sm hover:bg-(--color-bg-button) md:inline-flex"
              aria-label={
                mode === 'wysiwyg' ? 'Afficher la source Markdown' : 'Afficher l’éditeur visuel'
              }
            >
              {mode === 'wysiwyg' ? (
                <>
                  <Code className="h-4 w-4" aria-hidden="true" /> Source
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" aria-hidden="true" /> Visuel
                </>
              )}
            </button>
          </div>

          {/* Ligne 2 : barre compacte — repliée sur mobile (hidden), toujours
              visible sur desktop (md:flex). Dépliée sur mobile quand toolbarOpen. */}
          {mode === 'wysiwyg' && (
            <div className={toolbarOpen ? 'flex' : 'hidden md:flex'}>
              <MarkdownToolbar
                onInsert={(text) => {
                  crepeRef.current?.editor.action(insert(text))
                  focusEditor()
                }}
                onReset={() => {
                  crepeRef.current?.editor.action(replaceAll(''))
                  focusEditor()
                }}
                onSetHeading={(level) => {
                  if (!crepeRef.current) return
                  if (level === 0) {
                    crepeRef.current.editor.action(callCommand(turnIntoTextCommand.key))
                  } else {
                    crepeRef.current.editor.action(callCommand(wrapInHeadingCommand.key, level))
                  }
                  setBlockType(readBlockType())
                  focusEditor()
                }}
                currentBlockType={blockType}
                onToggleStrong={handleToggleStrong}
                onToggleEmphasis={handleToggleEmphasis}
                onToggleBulletList={handleToggleBulletList}
                onToggleBlockquote={handleToggleBlockquote}
              />
            </div>
          )}
        </div>
```

Points de vigilance :
- Le prop `onToggleLink` n'est **plus** passé (supprimé en Task 1).
- Les callbacks `onInsert`/`onReset`/`onSetHeading` appellent `focusEditor()` après action (clavier mobile conservé).
- Le `toggleMode` reste inchangé plus haut dans le composant ; il n'est atteignable que sur desktop (bouton `md:inline-flex`), donc `mode` reste `'wysiwyg'` sur mobile.

- [ ] **Step 3 : Contrôles statiques (couvre Task 1 + Task 2)**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected : aucune erreur, build Vite OK. Aucune référence résiduelle à `toggleLinkCommand`, `handleToggleLink` ou `onToggleLink`.

- [ ] **Step 4 : Commit (Task 1 + Task 2 ensemble)**

```bash
git add src/components/markdown/MarkdownToolbar.tsx src/components/markdown/MilkdownEditor.tsx
git commit -m "fix(atelier): barre d'outils au pouce — clic Android, menus, pliage mobile

- supprime onMouseDown/preventDefault (keepFocus) qui tuait le clic sur Android
- refocus explicite de l'éditeur après chaque commande (clavier mobile conservé)
- retire overflow-hidden (coupait les menus) ; flex-wrap anti-débordement
- barre repliée par défaut sur mobile, dépliable via bouton « Format »
- lien inséré au curseur (plus besoin de sélectionner)
- mode Source réservé au desktop (jamais de Markdown brut sur mobile)"
```

---

### Task 3 : Vérification visuelle mobile + desktop (Playwright/Chromium, API mockée)

**Files:**
- Aucune modification de code attendue (sauf correctif si un défaut est constaté).

**Interfaces:** néant (vérification).

- [ ] **Step 1 : Lancer le dev server et ouvrir l'atelier avec API mockée**

Suivre la procédure des mémoires `reference_inspection-visuelle` (mock de l'API pour peupler les cartes de messages, backend :8080 absent en local) et `project_e2e-flaky-parallele` (vérifier en série : `--workers=1`).

- [ ] **Step 2 : Gabarit mobile ~360 px — vérifier**

Redimensionner à 360×740, puis contrôler dans une carte de message :
1. La barre est **repliée** par défaut : seul le bouton « Format » (+ rien à droite, Source masqué) est visible. ✓
2. Un appui sur « Format » **déplie** la barre compacte ; elle **tient sur la largeur** (aucun débordement horizontal ; si repli de ligne via `flex-wrap`, c'est acceptable, rien n'est rogné). ✓
3. Ouvrir le menu **« Style »** → il s'affiche **entièrement** (non coupé) ; choisir « Titre 2 » transforme le paragraphe courant. ✓
4. Ouvrir le menu **« … »** → s'affiche entièrement ; « Réinitialiser », « Image », « Note », « Emoji » présents. ✓
5. Placer le curseur, appuyer **B** puis taper → le texte sort en **gras** (jamais de `**` affiché). Idem **I**. ✓
6. **Aucun** bouton « Source » n'est atteignable sur mobile. ✓
7. La barre reste **collante** (`sticky`) sous le bandeau global (h-16) pendant le défilement d'un message long. Si elle ne colle pas, vérifier qu'aucun ancêtre entre la carte et la racine de défilement n'a `overflow: hidden/auto` ; corriger le cas échéant. ✓

- [ ] **Step 3 : Gabarit desktop ~1280 px — vérifier**

1. La barre est **dépliée en permanence** (pas de bouton « Format »). ✓
2. Le bouton **« Source »** est visible et bascule vers la source Markdown puis revient en « Visuel ». ✓
3. Menus « Style » et « … » s'ouvrent sans être coupés ; Gras/Italique/Liste/Citation/Lien fonctionnent. ✓

- [ ] **Step 4 : Contrôle thème clair et sombre**

Basculer le thème : contrastes lisibles sur la barre, les menus et les puces (WCAG AA). ✓

- [ ] **Step 5 : Si un correctif a été nécessaire, commit**

```bash
git add -A
git commit -m "fix(atelier): correctifs post-vérif barre d'outils mobile"
```

Sinon, rien à committer (la vérification seule ne produit pas de diff).

---

## Self-Review (rempli à la rédaction)

- **Couverture spec ↔ maquette validée :** barre repliée par défaut mobile (Task 2 ✓) ; tient sur la largeur / ne déborde pas (`flex-wrap` + pliage, Task 1/2 ✓) ; boutons au curseur sans sélection (Task 1 : marques via commandes sur `view.state` ; lien via `onInsert` ✓) ; jamais de `**` visible (Source desktop-only, Task 2 ✓) ; pas de sidebar (barre horizontale en en-tête de carte ✓) ; desktop dépliée en permanence (`md:flex`, Task 2 ✓).
- **Bugs signalés ↔ correctifs :** B/I muets Android → suppression `keepFocus` + refocus (Task 1) ; menus « Style »/« … » coupés → suppression `overflow-hidden` (Task 1) ; barre non collante mobile → conservée `sticky top-16` + vérif ancêtres overflow (Task 3, Step 2.7) ; débordement → `flex-wrap` + pliage.
- **Cohérence des types :** prop `onToggleLink` supprimé des deux côtés (MilkdownEditor ne le passe plus, MarkdownToolbar ne le déclare plus) ; import `toggleLinkCommand` retiré ; `focusEditor` défini avant ses usages ; callbacks inchangés côté signature publique (`types.ts` intact).
- **Placeholders :** aucun ; chaque étape porte le code complet.
