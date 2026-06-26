# T12 — Cartes de citations (page d'accueil) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer la carte de citation de la page d'accueil (actuellement texte brut) en une carte conforme au template de la démo, adaptée aux couleurs Lumosphère et à Phosphor, avec rendu Markdown.

**Architecture :** `CitationCard` devient un composant de présentation pur qui reçoit tous ses champs en props et rend la mise en page calquée sur la démo (en-tête thème+œuvre, contenu Markdown, auteur conditionnel, notes de publication, pied avec mots-clés et boutons inertes). `AccueilPage` complète le type de données, calcule le droit d'édition à partir du rôle et transmet les champs à la carte.

**Tech Stack :** React 19 + TypeScript + Tailwind v4 (tokens `--color-*`), `react-markdown` + `remark-gfm`, Phosphor Icons, Vitest + Testing Library.

**Spec de référence :** `docs/superpowers/specs/2026-06-25-T12-accueil-cartes-design.md`

## Global Constraints

- Couleurs : **uniquement** via tokens `--color-*` de `src/index.css` — jamais de `slate-*`/`orange-*`/`indigo-*` en dur.
- Icônes : **Phosphor uniquement** (`@phosphor-icons/react`).
- Rendu texte : **Markdown** via `react-markdown` + `remark-gfm`. `rehype-raw` interdit (pas de HTML brut = pas d'injection).
- Identifiants techniques en anglais ; libellés UI en français accentué.
- Rôles éditeur/admin = `role_id ∈ [1, 2]` (1 = Administrateur, 2 = Éditeur), cohérent avec `src/components/Header.tsx`.
- Aucune modification de l'API ni de la base en T12.
- Gestionnaire de paquets : `pnpm`.

---

### Task 1: Composant `CitationCard` (mise en page + Markdown + tests)

**Files:**
- Modify: `src/components/CitationCard.tsx` (réécriture complète)
- Modify: `src/index.css` (ajout d'un bloc `.prose-display` pour le rendu Markdown)
- Modify: `package.json` (ajout `react-markdown`, `remark-gfm`)
- Test: `src/components/__tests__/CitationCard.test.tsx` (création)

**Interfaces:**
- Consumes : rien (composant de présentation pur).
- Produces : composant exporté

  ```ts
  type CitationCardProps = {
    contenu: string
    oeuvre_nom: string | null
    theme_nom: string | null
    auteur_nom: string | null
    notes: string | null
    mots_cles: string[]
    canEdit?: boolean
  }
  export function CitationCard(props: CitationCardProps): JSX.Element
  ```

- [ ] **Step 1: Installer les dépendances de rendu Markdown**

Run :
```bash
pnpm add react-markdown remark-gfm
```
Expected : `package.json` liste `react-markdown` et `remark-gfm` dans `dependencies`.

- [ ] **Step 2: Écrire le fichier de tests (qui échoue)**

Créer `src/components/__tests__/CitationCard.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CitationCard } from '../CitationCard'

const base = {
  contenu: 'Texte simple',
  oeuvre_nom: 'Telegram',
  theme_nom: 'Guidance',
  auteur_nom: 'Lulumineuse',
  notes: null,
  mots_cles: ['Foi', 'Lumière'],
}

describe('CitationCard', () => {
  it('affiche l’œuvre dans l’en-tête', () => {
    render(<CitationCard {...base} />)
    expect(screen.getByText('Telegram')).toBeInTheDocument()
  })

  it('affiche le thème dans l’en-tête', () => {
    render(<CitationCard {...base} />)
    expect(screen.getByText(/Guidance/)).toBeInTheDocument()
  })

  it('rend le Markdown (gras → <strong>)', () => {
    render(<CitationCard {...base} contenu="un mot **important** ici" />)
    expect(screen.getByText('important').tagName).toBe('STRONG')
  })

  it('masque l’auteur quand c’est Lulumineuse', () => {
    render(<CitationCard {...base} auteur_nom="Lulumineuse" />)
    expect(screen.queryByText(/Lulumineuse/)).not.toBeInTheDocument()
  })

  it('affiche l’auteur quand différent de Lulumineuse', () => {
    render(<CitationCard {...base} auteur_nom="Autre Auteur" />)
    expect(screen.getByText(/Autre Auteur/)).toBeInTheDocument()
  })

  it('masque les notes quand vides', () => {
    render(<CitationCard {...base} notes="   " />)
    expect(screen.queryByTestId('publication-notes')).not.toBeInTheDocument()
  })

  it('affiche les notes (Markdown) quand non vides', () => {
    render(<CitationCard {...base} notes="Voir *aussi* le contexte" />)
    expect(screen.getByTestId('publication-notes')).toBeInTheDocument()
    expect(screen.getByText('aussi').tagName).toBe('EM')
  })

  it('n’affiche jamais l’état', () => {
    render(<CitationCard {...base} notes="x" />)
    expect(screen.queryByText(/À Corriger|À Réviser|Publiée/)).not.toBeInTheDocument()
  })

  it('affiche les mots-clés en badges non cliquables', () => {
    render(<CitationCard {...base} />)
    const badge = screen.getByText('Foi')
    expect(badge.closest('button')).toBeNull()
  })

  it('affiche un bouton Favori désactivé', () => {
    render(<CitationCard {...base} />)
    expect(screen.getByLabelText('Ajouter aux favoris')).toBeDisabled()
  })

  it('affiche le bouton Éditer (désactivé) seulement si canEdit', () => {
    const { rerender } = render(<CitationCard {...base} canEdit={false} />)
    expect(screen.queryByLabelText('Éditer cette entrée')).not.toBeInTheDocument()
    rerender(<CitationCard {...base} canEdit />)
    expect(screen.getByLabelText('Éditer cette entrée')).toBeDisabled()
  })
})
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run : `pnpm test src/components/__tests__/CitationCard.test.tsx`
Expected : FAIL (le composant n'a pas encore la nouvelle interface ni les éléments testés — props `oeuvre_nom`/`notes`/`canEdit` inconnues, boutons absents).

- [ ] **Step 4: Réécrire le composant `CitationCard`**

Remplacer **tout** le contenu de `src/components/CitationCard.tsx` par :

```tsx
// src/components/CitationCard.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Heart, PencilSimple } from '@phosphor-icons/react'

type CitationCardProps = {
  contenu: string
  oeuvre_nom: string | null
  theme_nom: string | null
  auteur_nom: string | null
  notes: string | null
  mots_cles: string[]
  canEdit?: boolean
}

export function CitationCard({
  contenu,
  oeuvre_nom,
  theme_nom,
  auteur_nom,
  notes,
  mots_cles,
  canEdit = false,
}: CitationCardProps) {
  const showAuteur =
    auteur_nom != null && auteur_nom.trim() !== '' && auteur_nom !== 'Lulumineuse'
  const showNotes = notes != null && notes.trim() !== ''

  return (
    <article className="group rounded-lg border border-(--color-border) bg-(--color-bg-card) p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* En-tête : thème (gauche) + œuvre (droite) */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="text-xs text-(--color-text-secondary)">
          <span className="font-medium">Thème :</span> {theme_nom ?? 'Non spécifié'}
        </p>
        {oeuvre_nom && (
          <span className="shrink-0 text-sm font-medium text-(--color-accent)">
            {oeuvre_nom}
          </span>
        )}
      </div>

      {/* Contenu (Markdown) */}
      <div className="prose-display text-sm leading-relaxed text-(--color-text-primary)">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{contenu}</ReactMarkdown>
      </div>

      {/* Auteur (uniquement si ≠ Lulumineuse) */}
      {showAuteur && (
        <p className="mt-2 text-xs font-medium text-(--color-text-secondary)">— {auteur_nom}</p>
      )}

      {/* Notes de publication (uniquement si non vides) */}
      {showNotes && (
        <div
          data-testid="publication-notes"
          className="prose-display mt-4 border-t border-(--color-border) pt-3 text-xs text-(--color-text-secondary)"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
        </div>
      )}

      {/* Pied : mots-clés (gauche) + actions inertes (droite) */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-(--color-border) pt-3">
        <div className="flex flex-1 flex-wrap gap-1.5">
          {mots_cles.map((mc) => (
            <span
              key={mc}
              className="rounded-full bg-(--color-tag-bg) px-2.5 py-0.5 text-xs text-(--color-tag-text)"
            >
              {mc}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled
            title="Favori (bientôt disponible)"
            aria-label="Ajouter aux favoris"
            className="rounded-full p-1.5 text-(--color-text-placeholder) disabled:cursor-not-allowed"
          >
            <Heart className="h-5 w-5" aria-hidden="true" />
          </button>
          {canEdit && (
            <button
              type="button"
              disabled
              title="Éditer (bientôt disponible)"
              aria-label="Éditer cette entrée"
              className="rounded-full p-1.5 text-(--color-text-placeholder) disabled:cursor-not-allowed"
            >
              <PencilSimple className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 5: Ajouter le style de rendu Markdown dans `index.css`**

Ajouter à la fin de `src/index.css` (après le bloc `body`) :

```css
/* Rendu Markdown des citations et des notes (carte de citation) */
.prose-display > :first-child {
  margin-top: 0;
}
.prose-display > :last-child {
  margin-bottom: 0;
}
.prose-display p {
  margin: 0.5rem 0;
}
.prose-display strong {
  font-weight: 600;
}
.prose-display em {
  font-style: italic;
}
.prose-display ul {
  list-style: disc;
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}
.prose-display ol {
  list-style: decimal;
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}
.prose-display li {
  margin: 0.25rem 0;
}
.prose-display h1,
.prose-display h2,
.prose-display h3 {
  font-weight: 600;
  margin: 0.75rem 0 0.5rem;
}
.prose-display a {
  color: var(--color-action);
  text-decoration: underline;
}
.prose-display blockquote {
  border-left: 3px solid var(--color-border);
  padding-left: 0.75rem;
  margin: 0.5rem 0;
  color: var(--color-text-secondary);
}
.prose-display table {
  border-collapse: collapse;
  margin: 0.5rem 0;
}
.prose-display th,
.prose-display td {
  border: 1px solid var(--color-border);
  padding: 0.25rem 0.5rem;
}
```

- [ ] **Step 6: Lancer les tests pour vérifier qu'ils passent**

Run : `pnpm test src/components/__tests__/CitationCard.test.tsx`
Expected : PASS (11 tests verts).

- [ ] **Step 7: Vérifier le lint**

Run : `pnpm lint`
Expected : aucune erreur.

- [ ] **Step 8: Commit**

```bash
git add src/components/CitationCard.tsx src/components/__tests__/CitationCard.test.tsx src/index.css package.json pnpm-lock.yaml
git commit -m "feat(accueil): carte de citation conforme au template (Markdown, Phosphor)"
```

---

### Task 2: Brancher `AccueilPage` (type, droits, props)

**Files:**
- Modify: `src/features/accueil/AccueilPage.tsx`

**Interfaces:**
- Consumes : `CitationCard` (Task 1) avec les props `contenu, oeuvre_nom, theme_nom, auteur_nom, notes, mots_cles, canEdit` ; `useAuth()` de `@/hooks/useAuth` renvoyant `{ user: { role_id } | null }`.
- Produces : rien (feuille de l'arbre).

- [ ] **Step 1: Compléter le type `Citation` et le câblage**

Remplacer **tout** le contenu de `src/features/accueil/AccueilPage.tsx` par :

```tsx
// src/features/accueil/AccueilPage.tsx
import { useEffect, useState } from 'react'
import { apiClient } from '@/services/api'
import { CitationCard } from '@/components/CitationCard'
import { useAuth } from '@/hooks/useAuth'

const ADMIN_ROLES = [1, 2] // Administrateur, Éditeur

type Citation = {
  id: number
  contenu: string
  oeuvre_nom: string | null
  auteur_nom: string | null
  theme_nom: string | null
  notes: string | null
  mots_cles: { id: number; mot: string }[]
}

export function AccueilPage() {
  const { user } = useAuth()
  const canEdit = user ? ADMIN_ROLES.includes(user.role_id) : false

  const [citations, setCitations] = useState<Citation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .findCitations()
      .then((res) => {
        if (res.status === 'ok' && res.data) {
          setCitations(res.data.items as Citation[])
        } else {
          setError(res.errors?.[0] ?? 'Erreur de chargement')
        }
      })
      .catch(() => setError('Impossible de contacter le serveur'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-(--color-text-secondary)">
          {loading
            ? 'Chargement…'
            : `${citations.length} entrée${citations.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">
          {error}
        </div>
      )}

      {!loading && !error && citations.length === 0 && (
        <p className="text-sm text-(--color-text-placeholder)">Aucune entrée</p>
      )}

      <div className="flex flex-col gap-4">
        {citations.map((c) => (
          <CitationCard
            key={c.id}
            contenu={c.contenu}
            oeuvre_nom={c.oeuvre_nom}
            theme_nom={c.theme_nom}
            auteur_nom={c.auteur_nom}
            notes={c.notes}
            mots_cles={(c.mots_cles ?? []).map((k) => k.mot)}
            canEdit={canEdit}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier le typage et le build**

Run : `pnpm build`
Expected : succès (`tsc --noEmit` puis build Vite OK, pas d'erreur de type sur les props de `CitationCard`).

- [ ] **Step 3: Vérifier le lint et la suite de tests complète**

Run : `pnpm lint && pnpm test`
Expected : aucune erreur de lint ; tous les tests verts (dont les 11 de `CitationCard`).

- [ ] **Step 4: Vérification manuelle**

Lancer `pnpm dev`, ouvrir la page d'accueil :
- chaque carte montre thème (gauche) + œuvre en couleur d'accent (droite) ;
- le contenu est mis en forme (gras, listes…) ;
- l'auteur est masqué pour « Lulumineuse », visible pour les autres ;
- les notes apparaissent sous le texte uniquement quand elles existent ;
- mots-clés en badges ; bouton Favori présent et inerte ; bouton Éditer présent (inerte) seulement si connecté en éditeur/admin.

- [ ] **Step 5: Commit**

```bash
git add src/features/accueil/AccueilPage.tsx
git commit -m "feat(accueil): brancher la carte (œuvre, notes, droit d'édition par rôle)"
```

---

## Self-Review

**Spec coverage :**
- En-tête thème + œuvre → Task 1 Step 4 ✓
- Contenu Markdown → Task 1 Steps 1, 4, 5 ✓
- Auteur conditionnel (≠ Lulumineuse) → Task 1 Step 4 + tests ✓
- Notes de publication conditionnelles, style note de bas de page → Task 1 Step 4 + tests ✓
- Mots-clés en badges non cliquables → Task 1 Step 4 + test ✓
- État jamais affiché → Task 1 (non rendu) + test ✓
- Boutons Favori/Éditer inertes, Éditer réservé éditeur/admin → Task 1 Step 4 + tests, Task 2 (calcul `canEdit`) ✓
- Couleurs via tokens, Phosphor → respecté dans le code ✓
- Aucune modif API/DB → respecté ✓
- Libellé simple de thème (pas de chemin) → `theme_nom` affiché tel quel ✓

**Placeholder scan :** aucun TBD/TODO ; tout le code est fourni.

**Type consistency :** `CitationCardProps` (Task 1) ⇄ props passées par `AccueilPage` (Task 2) — noms et types alignés ; `ADMIN_ROLES = [1, 2]` cohérent avec `Header.tsx`.

## Notes d'écart avec la spec

- Ajout de `src/index.css` aux fichiers touchés (bloc `.prose-display`) : non listé dans la spec mais nécessaire pour un rendu Markdown lisible (équivalent du `.prose-display` de la démo). Écart mineur, signalé.
