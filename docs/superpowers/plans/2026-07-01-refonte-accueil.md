# Refonte de la page d'accueil (vue corpus) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer les 19 décisions validées de la critique design de la page d'accueil (couleurs, layout carte « Variante B », barre de résultats, accessibilité, finitions), sans régression.

**Architecture:** Modifications ciblées de composants React/Tailwind existants + tokens CSS. Aucune nouvelle dépendance (le virtualiseur fenêtre `useWindowVirtualizer` est déjà fourni par `@tanstack/react-virtual`). Le tri sort de la sidebar vers la barre de résultats ; la carte de citation devient responsive à deux colonnes ; la sidebar devient une carte flottante.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS v4 (tokens via `@theme` + variables CSS), `@tanstack/react-virtual`, Vitest + Testing Library (unit), Playwright (e2e).

## Global Constraints

- UI labels en **français** avec accents corrects ; identifiants techniques en anglais.
- Couleurs sémantiques **uniquement via tokens** `var(--color-*)` / classes `(--color-*)` — jamais de hex en dur dans les classes.
- Contraste texte **≥ 4,5:1** (texte courant).
- `prefers-reduced-motion` respecté (aucune animation ajoutée ici).
- Quality gate avant « fait » : `pnpm lint` ✓, `pnpm build` ✓, `pnpm tsc --noEmit` ✓, tests présents, `gitleaks detect -v` ✓.
- **Commits/push seulement sur demande explicite** — ce plan prépare les commits mais ne pousse pas.
- Valeurs de couleur validées : or-encre clair `#7a5f28` ; accent sombre `#d3b67b` ; bouton d'action sombre `#3f7a54` (texte blanc).

---

## File Structure

- `src/index.css` — tokens couleurs (accent-ink, action sombre, accent sombre) + règle globale `accent-color` des cases à cocher.
- `src/components/Header.tsx` — retrait de l'ombre (clair), lien Favoris actif en or-encre.
- `src/components/CorpusFilters.tsx` — retrait de la section « Trier par » (déplacée), titres de sections en `h2` + casse normale.
- `src/components/ResultsInfoBar.tsx` — zone de statut à gauche, compteur + tri permanent « Afficher par : Date / Pertinence » à droite, cadre conditionnel.
- `src/components/CitationCard.tsx` — carte « Variante B » responsive (rail bureau / disposition mobile actuelle), `aria-label`. Extraction de deux helpers internes (`CardKeywords`, `CardActions`) pour éviter la duplication.
- `src/components/Sidebar.tsx` — filtres enveloppés dans une carte flottante, plus large.
- `src/layouts/MainLayout.tsx` — coquille centrée pour accueillir la sidebar-carte.
- `src/features/accueil/AccueilPage.tsx` — titre `h1`, état d'erreur (alert + Réessayer), virtualisation fenêtre, message « Fin des résultats ».
- `docs/DESIGN.md` + `docs/_contexte-ia/` — synchronisation documentaire (virage sidebar-carte, palette sombre, casse titres, layout B).
- Tests : `src/components/__tests__/{CitationCard,ResultsInfoBar,Header,CorpusFilters}.test.tsx`, `e2e/responsive.spec.ts`.

Ordre d'exécution : Task 1 (tokens) → 2 (Header) → 3 (CorpusFilters) → 4 (ResultsInfoBar) → 5 (CitationCard) → 6 (Sidebar) → 7 (MainLayout) → 8 (AccueilPage) → 9 (docs). Chaque tâche est indépendamment testable.

---

### Task 1: Tokens couleurs (index.css)

**Files:**
- Modify: `src/index.css` (bloc `:root` lignes ~40-74 et bloc `.dark` lignes ~76-101)

**Interfaces:**
- Produces: tokens `--color-accent-ink` (clair `#7a5f28`), `--color-accent`/`--color-accent-ink` (sombre `#d3b67b`), `--color-action`/`--color-action-text` (sombre `#3f7a54`/`#ffffff`) ; règle globale `input[type="checkbox"] { accent-color: var(--color-action) }`.

- [ ] **Step 1 — Modifier les tokens clairs.** Dans `:root`, remplacer `--color-accent-ink: #8a6d2f;` par :

```css
  --color-accent-ink: #7a5f28; /* or-encre foncé — lisible sur crème (~5,7:1) et blanc */
```

- [ ] **Step 2 — Modifier les tokens sombres.** Dans `.dark`, remplacer les trois lignes concernées :

```css
  --color-action: #3f7a54;       /* vert nuit (rappel du bandeau) — texte blanc 5,1:1 */
  --color-action-text: #ffffff;
  /* ... */
  --color-accent: #d3b67b;       /* Or Parchemin de marque (remplace l'orange) */
  /* ... */
  --color-accent-ink: #d3b67b;   /* accent texte sombre = or de marque (7,5:1 sur carte) */
```

> Laisser `--color-action-hover` inchangé (le survol violet est un choix assumé, cohérent clair/sombre).

- [ ] **Step 3 — Ajouter la règle globale des cases à cocher.** À la fin de `src/index.css`, ajouter :

```css
input[type='checkbox'] {
  accent-color: var(--color-action);
}
```

- [ ] **Step 4 — Vérifier build + types.**

Run: `pnpm build && pnpm tsc --noEmit`
Expected: succès, aucune erreur.

- [ ] **Step 5 — Commit.**

```bash
git add src/index.css
git commit -m "style(theme): or-encre #7a5f28, palette sombre vert+or, accent-color des cases"
```

---

### Task 2: Header — ombre retirée + Favoris lisible

**Files:**
- Modify: `src/components/Header.tsx` (ligne ~107 header, ligne ~56 lien Favoris)
- Test: `src/components/__tests__/Header.test.tsx`

**Interfaces:**
- Consumes: token `--color-accent-ink` (Task 1).

- [ ] **Step 1 — Retirer l'ombre du header.** Ligne ~107, retirer `shadow-sm` de la classe du `<header>` (garder `border-b`) :

```tsx
    <header className="sticky top-0 z-50 border-b border-(--color-border-header) bg-(--color-bg-header) px-4 lg:px-6">
```

- [ ] **Step 2 — Favoris actif en or-encre.** Ligne ~56, remplacer `text-(--color-accent)` par `text-(--color-accent-ink)` dans le lien Favoris :

```tsx
            hasFavorites ? 'text-(--color-accent-ink)' : 'text-(--color-link-header)'
```

- [ ] **Step 3 — Adapter/ajouter l'assertion de test.** Dans `Header.test.tsx`, ajouter (le lien Favoris utilise la classe or-encre quand des favoris existent) :

```tsx
  it('le lien Favoris actif utilise la couleur or-encre (lisible)', () => {
    // rendu avec au moins un favori en localStorage — suivre le helper de rendu existant du fichier
    renderHeaderWithFavorites(['1'])
    const link = screen.getByLabelText('Mes favoris')
    expect(link.className).toContain('text-(--color-accent-ink)')
    expect(link.className).not.toContain('text-(--color-accent)')
  })
```

> Réutiliser le pattern de rendu déjà présent dans `Header.test.tsx` (providers Router/Auth/Favorites). Si un favori se pose via `localStorage`, l'écrire avant `render`.

- [ ] **Step 4 — Lancer les tests Header.**

Run: `pnpm test -- Header`
Expected: PASS.

- [ ] **Step 5 — Commit.**

```bash
git add src/components/Header.tsx src/components/__tests__/Header.test.tsx
git commit -m "fix(header): retire l'ombre (clair) et rend le lien Favoris lisible (or-encre)"
```

---

### Task 3: CorpusFilters — tri retiré, titres en h2 casse normale

**Files:**
- Modify: `src/components/CorpusFilters.tsx` (const `sectionTitle` ligne ~17 ; section « Trier par » lignes ~73-101)
- Test: `src/components/__tests__/CorpusFilters.test.tsx`

**Interfaces:**
- Produces: plus de contrôle de tri dans la sidebar (déplacé en Task 4). Titres de sections rendus en `<h2>`.

- [ ] **Step 1 — Titres en casse normale.** Remplacer la constante ligne ~17 :

```tsx
const sectionTitle = 'mb-1 text-sm font-semibold text-(--color-text-secondary)'
```

- [ ] **Step 2 — Passer les titres en `<h2>`.** Dans le JSX, remplacer chaque `<h3 className={sectionTitle}>` par `<h2 className={sectionTitle}>` (sections Œuvres, Thèmes, Mots-clés, Période).

- [ ] **Step 3 — Supprimer la section « Trier par ».** Retirer entièrement le bloc `{query.trim() && ( ... )}` (lignes ~73-101) contenant les boutons Date/Pertinence. Retirer aussi `sort`, `setSort` de la déstructuration `useCorpusSearch()` en tête de composant (ils ne sont plus utilisés ici).

- [ ] **Step 4 — Mettre à jour le test.** Dans `CorpusFilters.test.tsx`, retirer/adapter tout test ciblant les boutons « Date »/« Pertinence », et ajouter :

```tsx
  it('les titres de sections sont des h2 en casse normale', () => {
    renderCorpusFilters() // helper existant du fichier
    const h2 = screen.getByRole('heading', { level: 2, name: /Œuvres/ })
    expect(h2).toBeInTheDocument()
    expect(h2.className).not.toContain('uppercase')
  })

  it('ne contient plus le tri Date/Pertinence', () => {
    renderCorpusFilters()
    expect(screen.queryByRole('button', { name: 'Pertinence' })).not.toBeInTheDocument()
  })
```

- [ ] **Step 5 — Lancer les tests.**

Run: `pnpm test -- CorpusFilters`
Expected: PASS.

- [ ] **Step 6 — Commit.**

```bash
git add src/components/CorpusFilters.tsx src/components/__tests__/CorpusFilters.test.tsx
git commit -m "refactor(filters): titres h2 casse normale, retire le tri (déplacé vers la barre)"
```

---

### Task 4: ResultsInfoBar — statut + compteur fixe + tri permanent

**Files:**
- Modify: `src/components/ResultsInfoBar.tsx`
- Test: `src/components/__tests__/ResultsInfoBar.test.tsx` (créer)

**Interfaces:**
- Consumes: `useCorpusSearch()` → `items, loading, total, hasActiveFilters, query, sort, setSort` (+ les champs déjà utilisés pour les pastilles).
- Produces: barre à trois zones — statut (gauche, réservé aux messages de jobs, vide pour l'instant), compteur (droite, position stable), tri « Afficher par : Date / Pertinence » (droite du compteur, permanent). Cadre (`border`) présent **seulement** si un message de statut existe.

- [ ] **Step 1 — Écrire le test (échoue).** Créer `ResultsInfoBar.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ResultsInfoBar } from '../ResultsInfoBar'
import { renderWithCorpus } from '@/features/corpus/__tests__/testUtils' // helper provider existant

describe('ResultsInfoBar', () => {
  it('affiche le tri en permanence, Pertinence désactivée sans recherche', () => {
    renderWithCorpus(<ResultsInfoBar />, { query: '' })
    expect(screen.getByText('Afficher par :')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Date' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Pertinence' })).toBeDisabled()
  })

  it('active Pertinence quand une recherche est saisie', () => {
    renderWithCorpus(<ResultsInfoBar />, { query: 'âme' })
    expect(screen.getByRole('button', { name: 'Pertinence' })).toBeEnabled()
  })
})
```

> Si aucun helper `renderWithCorpus` n'existe, suivre le pattern de `CorpusSearchProvider.test.tsx` pour envelopper avec le provider et injecter l'état initial (query via l'URL/searchParams).

- [ ] **Step 2 — Lancer, vérifier l'échec.**

Run: `pnpm test -- ResultsInfoBar`
Expected: FAIL (composant pas encore mis à jour).

- [ ] **Step 3 — Implémenter la barre.** Récupérer `sort, setSort` du contexte et remplacer la `<div>` de tête (lignes ~60-70) par :

```tsx
      <div
        className={`flex min-h-[52px] items-center gap-4 rounded-lg p-3 ${
          statusMessage ? 'border border-(--color-border) bg-(--color-bg-card)' : ''
        }`}
      >
        <div className="flex-1 text-sm text-(--color-text-secondary)">{statusMessage}</div>
        <span role="status" aria-live="polite" className="text-sm font-semibold text-(--color-text-primary)">
          {countLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-(--color-text-secondary)">Afficher par :</span>
          <button
            type="button"
            onClick={() => setSort('date')}
            aria-pressed={sort === 'date'}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              sort === 'date'
                ? 'bg-(--color-action) text-(--color-action-text)'
                : 'border border-(--color-border) bg-(--color-bg-sidebar) text-(--color-text-secondary) hover:bg-(--color-bg-button)'
            }`}
          >
            Date
          </button>
          <button
            type="button"
            onClick={() => setSort('score')}
            disabled={query.trim() === ''}
            aria-pressed={sort === 'score'}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              sort === 'score'
                ? 'bg-(--color-action) text-(--color-action-text)'
                : 'border border-(--color-border) bg-(--color-bg-sidebar) text-(--color-text-secondary) hover:bg-(--color-bg-button)'
            }`}
          >
            Pertinence
          </button>
        </div>
      </div>
```

Déclarer en tête du composant, pour l'instant, la zone de statut (le câblage des jobs viendra plus tard) :

```tsx
  const statusMessage: string | null = null // réservé aux messages « Traitement/Export en cours… »
```

> Conserver inchangé le bloc des pastilles de filtres actifs (`hasActiveFilters && ...`) sous la barre.

- [ ] **Step 4 — Lancer les tests.**

Run: `pnpm test -- ResultsInfoBar`
Expected: PASS.

- [ ] **Step 5 — Commit.**

```bash
git add src/components/ResultsInfoBar.tsx src/components/__tests__/ResultsInfoBar.test.tsx
git commit -m "feat(results-bar): tri permanent Afficher par + zone statut + cadre conditionnel"
```

---

### Task 5: CitationCard — Variante B responsive + aria-label

**Files:**
- Modify: `src/components/CitationCard.tsx`
- Test: `src/components/__tests__/CitationCard.test.tsx`

**Interfaces:**
- Consumes: token `--color-accent-ink`.
- Produces: `<article aria-label="{œuvre} — {thème}">` ; deux helpers internes `CardKeywords`, `CardActions` (mêmes props que le pied actuel) réutilisés en pied mobile ET dans le rail bureau.

- [ ] **Step 1 — Écrire le test (échoue).** Ajouter à `CitationCard.test.tsx` :

```tsx
  it('expose un nom accessible = œuvre — thème', () => {
    render(<CitationCard {...base} />)
    expect(screen.getByRole('article', { name: 'Telegram — Guidance' })).toBeInTheDocument()
  })

  it('le bloc de texte est plafonné en largeur sur desktop (max-w-[85ch])', () => {
    render(<CitationCard {...base} />)
    const prose = screen.getByText('Texte simple').closest('.prose-display')
    expect(prose?.className).toContain('lg:max-w-[85ch]')
  })
```

- [ ] **Step 2 — Lancer, vérifier l'échec.**

Run: `pnpm test -- CitationCard`
Expected: FAIL.

- [ ] **Step 3 — Extraire les helpers.** En haut de `CitationCard.tsx` (après les imports), ajouter :

```tsx
function CardKeywords({ mots_cles }: { mots_cles: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {mots_cles.map((mc) => (
        <span
          key={mc}
          className="rounded-full bg-(--color-bg-sidebar) px-2 py-1 text-xs text-(--color-text-secondary)"
        >
          {mc}
        </span>
      ))}
    </div>
  )
}

function CardActions({
  isFavorited,
  onToggleFavorite,
  canEdit,
  onEdit,
}: Pick<CitationCardProps, 'isFavorited' | 'onToggleFavorite' | 'canEdit' | 'onEdit'>) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onToggleFavorite}
        title={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        aria-label={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        aria-pressed={isFavorited}
        className={`rounded-full p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action) ${
          isFavorited
            ? 'text-(--color-accent-ink)'
            : 'text-(--color-text-placeholder) hover:text-(--color-accent-ink)'
        }`}
      >
        <Heart className="h-[18px] w-[18px]" aria-hidden="true" weight={isFavorited ? 'fill' : 'regular'} />
      </button>
      {canEdit && (
        <button
          type="button"
          onClick={onEdit}
          title="Éditer cette entrée"
          aria-label="Éditer cette entrée"
          className="rounded-full p-1.5 text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)"
        >
          <PencilSimple className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4 — Récrire le rendu de la carte.** Remplacer le `return (...)` par la structure responsive (mobile = actuel, `lg` = deux colonnes) :

```tsx
  const accessibleName = `${oeuvre_nom ?? 'Citation'}${theme_nom ? ` — ${theme_nom}` : ''}`
  return (
    <article
      aria-label={accessibleName}
      className="group rounded-lg border border-(--color-border) bg-(--color-bg-card) px-7 py-5 shadow-sm transition-shadow hover:shadow-md lg:flex lg:gap-6"
    >
      <div className="min-w-0 lg:flex-1">
        <div className="mb-3 flex items-start justify-between gap-4 lg:mb-2 lg:block">
          <div className="flex-1 text-xs text-(--color-text-secondary)">
            <span className="font-medium text-(--color-text-primary)">Thème :&nbsp;</span>
            {theme_nom ?? 'Non spécifié'}
          </div>
          {oeuvre_nom && (
            <span className="shrink-0 text-sm font-medium text-(--color-accent-ink) lg:hidden">
              {oeuvre_nom}
            </span>
          )}
        </div>

        <div className="prose-display flow-root text-sm text-(--color-text-primary) lg:max-w-[85ch]">
          <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{contenu}</ReactMarkdown>
        </div>

        {showAuteur && (
          <p className="mt-2 text-xs font-medium text-(--color-text-secondary)">— {auteur_nom}</p>
        )}

        {showNotes && (
          <div
            data-testid="publication-notes"
            className="prose-display mt-4 border-t border-(--color-border) pt-3 text-xs text-(--color-text-secondary)"
          >
            <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{notes}</ReactMarkdown>
          </div>
        )}

        {/* Pied mobile : mots-clés + actions ; masqué sur desktop (déplacé dans le rail) */}
        <div className="mt-3 flex min-h-[30px] items-center justify-between gap-2 border-t border-(--color-border) pt-3 lg:hidden">
          <CardKeywords mots_cles={mots_cles} />
          <CardActions
            isFavorited={isFavorited}
            onToggleFavorite={onToggleFavorite}
            canEdit={canEdit}
            onEdit={onEdit}
          />
        </div>
      </div>

      {/* Rail bureau : œuvre, mots-clés, actions */}
      <div className="hidden lg:flex lg:w-52 lg:shrink-0 lg:flex-col lg:gap-3 lg:border-l lg:border-(--color-border) lg:pl-5">
        {oeuvre_nom && (
          <span className="text-sm font-medium text-(--color-accent-ink)">{oeuvre_nom}</span>
        )}
        <CardKeywords mots_cles={mots_cles} />
        <CardActions
          isFavorited={isFavorited}
          onToggleFavorite={onToggleFavorite}
          canEdit={canEdit}
          onEdit={onEdit}
        />
      </div>
    </article>
  )
```

> Note tests : `getByLabelText('Ajouter aux favoris')` peut désormais matcher deux boutons (pied mobile + rail, tous deux dans le DOM). Adapter les tests existants qui utilisent `getBy...` en `getAllBy...[0]` si l'assertion l'exige, OU garder un seul rendu visible en enveloppant chaque zone — ici les deux restent dans le DOM (masquage CSS). Mettre à jour les 3 tests favoris/éditer concernés pour utiliser `getAllByLabelText(...)[0]`.

- [ ] **Step 5 — Lancer les tests.**

Run: `pnpm test -- CitationCard`
Expected: PASS (y compris les 2 nouveaux).

- [ ] **Step 6 — Commit.**

```bash
git add src/components/CitationCard.tsx src/components/__tests__/CitationCard.test.tsx
git commit -m "feat(citation-card): layout 2 colonnes responsive + nom accessible + texte 85ch"
```

---

### Task 6: Sidebar en carte flottante

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Test: `src/components/__tests__/Sidebar.test.tsx`

**Interfaces:**
- Consumes: layout centré fourni par MainLayout (Task 7).
- Produces: filtres corpus enveloppés dans une carte (`bg-(--color-bg-card) rounded-lg border shadow-sm`), largeur `lg:w-96`.

- [ ] **Step 1 — Envelopper les filtres dans une carte.** Dans la branche non-admin (lignes ~23-55), élargir l'`aside` (`lg:w-96`) et donner l'aspect carte au conteneur interne :

```tsx
    <aside
      id="corpus-filters"
      className={`w-full shrink-0 lg:block lg:w-96 ${filtersOpen ? 'block' : 'hidden'}`}
    >
      <div className="flex flex-col rounded-lg border border-(--color-border) bg-(--color-bg-card) shadow-sm lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
        <div className="flex-grow overflow-y-auto p-4">
          <CorpusFilters />
        </div>
        <div className="flex-shrink-0 border-t border-(--color-border) p-4">
          {/* bouton Réinitialiser + crédit Lulumineuse — inchangés */}
        </div>
      </div>
    </aside>
```

> Conserver le contenu du pied (bouton Réinitialiser + lien Lulumineuse) tel quel. La branche admin (`AdminNav`) reste inchangée.

- [ ] **Step 2 — Ajuster le test.** Dans `Sidebar.test.tsx`, ajouter :

```tsx
  it('la sidebar corpus est rendue en carte (bordure + ombre)', () => {
    renderSidebar('/') // helper existant, route corpus
    const region = document.getElementById('corpus-filters')!
    expect(region.querySelector('.rounded-lg.shadow-sm')).not.toBeNull()
  })
```

- [ ] **Step 3 — Lancer les tests.**

Run: `pnpm test -- Sidebar`
Expected: PASS.

- [ ] **Step 4 — Commit.**

```bash
git add src/components/Sidebar.tsx src/components/__tests__/Sidebar.test.tsx
git commit -m "feat(sidebar): filtres corpus en carte flottante, élargie (lg:w-96)"
```

---

### Task 7: MainLayout — coquille centrée

**Files:**
- Modify: `src/layouts/MainLayout.tsx`

**Interfaces:**
- Produces: conteneur centré `max-w-screen-2xl mx-auto`, padding, `gap` entre sidebar-carte et contenu.

- [ ] **Step 1 — Centrer et espacer la coquille.** Remplacer le bloc sous `<Header />` :

```tsx
        <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 p-4 lg:flex-row lg:p-6">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
```

- [ ] **Step 2 — Vérifier build + e2e responsive.**

Run: `pnpm build && pnpm tsc --noEmit`
Expected: succès.

- [ ] **Step 3 — Commit.**

```bash
git add src/layouts/MainLayout.tsx
git commit -m "feat(layout): coquille centrée max-w-screen-2xl avec gap sidebar/contenu"
```

---

### Task 8: AccueilPage — titre, erreur récupérable, défilement unique, fin de liste

**Files:**
- Modify: `src/features/accueil/AccueilPage.tsx`
- Test: `e2e/responsive.spec.ts` (ou un nouveau `e2e/accueil.spec.ts`)

**Interfaces:**
- Consumes: `useCorpusSearch()` (`refresh`, `hasMore`, `error`, `items`), `useWindowVirtualizer` de `@tanstack/react-virtual`.

- [ ] **Step 1 — Renommer le titre principal (invisible).** Ligne ~63 :

```tsx
      <h1 className="sr-only">Index interactif - publications</h1>
```

- [ ] **Step 2 — Erreur annoncée + Réessayer.** Remplacer le bloc `{error && ...}` (lignes ~66-70) :

```tsx
      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-2 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)"
        >
          <span>Impossible de charger les citations. Vérifiez votre connexion, puis réessayez.</span>
          <button
            type="button"
            onClick={refresh}
            className="self-start rounded-md bg-(--color-action) px-3 py-1.5 text-sm font-medium text-(--color-action-text) transition-colors hover:bg-(--color-action-hover)"
          >
            Réessayer
          </button>
        </div>
      )}
```

- [ ] **Step 3 — Virtualisation fenêtre.** Remplacer `useVirtualizer` par `useWindowVirtualizer` (import depuis `@tanstack/react-virtual`), supprimer `parentRef` et le conteneur `height: 80vh`. Le virtualiseur mesure la fenêtre :

```tsx
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => 200,
    overscan: 5,
  })
```

Et le rendu virtualisé n'a plus de conteneur scrollable interne : le `div` externe garde `position: relative` + `height = getTotalSize()` sans `overflow-auto` ni hauteur fixe. Le décalage vertical utilise `virtualizer.getVirtualItems()[0]?.start` comme padding-top de tête (pattern window virtualizer).

> Référence API : `useWindowVirtualizer` renvoie le même contrat que `useVirtualizer` mais scrolle sur `window`. Adapter le wrapper : retirer `ref={parentRef}` et `style={{ height: '80vh' }}`.

- [ ] **Step 4 — Message de fin de liste.** Sous le bloc de liste, quand il n'y a plus rien à charger :

```tsx
      {!loading && !hasMore && items.length > 0 && (
        <p className="mt-6 text-center text-sm text-(--color-text-secondary)">Fin des résultats.</p>
      )}
```

- [ ] **Step 5 — Test e2e.** Ajouter à `e2e/responsive.spec.ts` un cas (mock API si nécessaire, suivre les specs existantes) :

```ts
test('erreur de chargement : message clair + bouton Réessayer', async ({ page }) => {
  await page.route('**/api/**citations**', (r) => r.abort())
  await page.goto('/')
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('Impossible de charger les citations')
  await expect(alert.getByRole('button', { name: 'Réessayer' })).toBeVisible()
})
```

- [ ] **Step 6 — Vérifier.**

Run: `pnpm build && pnpm tsc --noEmit && pnpm test:e2e -- responsive`
Expected: succès.

- [ ] **Step 7 — Commit.**

```bash
git add src/features/accueil/AccueilPage.tsx e2e/responsive.spec.ts
git commit -m "feat(accueil): titre, erreur récupérable (alert+Réessayer), défilement unique, fin de liste"
```

---

### Task 9: Synchronisation documentaire

**Files:**
- Modify: `docs/DESIGN.md` (sections 2 Colors mode sombre, 4bis Mise en page, 5 Tags/CorpusFilters)
- Modify: `docs/_contexte-ia/` (le fichier pertinent sur l'UI/frontend, si présent)

**Interfaces:** aucune (documentation).

- [ ] **Step 1 — Mettre à jour DESIGN.md.** Consigner : palette sombre (action vert `#3f7a54`, accent or `#d3b67b`), or-encre clair `#7a5f28` ; §4bis « sidebar en carte flottante centrée » (remplace « sidebar collée au bord ») + carte citation « Variante B » (texte 85ch bureau, rail méta, mobile inchangé) ; titres de filtres en casse normale `h2` ; tri « Afficher par » permanent dans la barre.

- [ ] **Step 2 — Vérifier la cohérence** avec `docs/_contexte-ia/` (autorité) et synchroniser si un fichier UI y décrit ces règles.

- [ ] **Step 3 — Commit.**

```bash
git add docs/DESIGN.md docs/_contexte-ia/
git commit -m "docs(design): sidebar-carte, palette sombre vert+or, carte 2 colonnes, tri barre"
```

---

## Self-Review

**Spec coverage** (19 décisions → tâches) :
1 survol violet conservé → Task 1 (non modifié, noté). 2 accent sombre or → T1. 3 bouton sombre vert → T1. 4 Favoris or-encre → T1+T2. 5 cases vert → T1. 6 carte bureau 2 col → T5. 7 mobile inchangé → T5. 8 sidebar carte → T6+T7. 9 cadre conditionnel barre → T4. 10 tri permanent → T3 (retrait) + T4 (ajout). 11 badges conservés → T4 (inchangés). 12 cartes nommées → T5. 13 titre h1 invisible → T8. 14 filtres h2 → T3. 15 erreur alert+Réessayer → T8. 16 ombre header → T2. 17 défilement unique → T8. 18 fin des résultats → T8. 19 casse normale → T3. ✓ Toutes couvertes.

**Placeholder scan :** `statusMessage = null` est un placeholder **assumé** (zone réservée aux jobs, câblage hors périmètre de cette refonte) — documenté comme tel, pas un TODO caché.

**Type consistency :** `sort: 'date' | 'score'` et `setSort` alignés avec `CorpusSearchContext.ts` ; `CardActions`/`CardKeywords` typés via `Pick<CitationCardProps, ...>` ; `useWindowVirtualizer` confirmé exporté par `@tanstack/react-virtual`.

**Risque identifié :** Task 5 crée deux jeux de boutons favoris/éditer (pied mobile + rail, tous deux dans le DOM) → adapter les sélecteurs de test existants en `getAllBy...`. Signalé dans la note de Task 5, Step 4.
