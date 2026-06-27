# T13 — Recherche basique + filtres Œuvre/Thème — Design

> Source trame : `docs/1-trame_execution-lumosphere.md` — T13 « Recherche basique : fulltext + filtres thème/œuvre/auteur » (Tranche 2). Prérequis T11 (config FULLTEXT) ✅ et T12 (vue cartes) ✅.

## 1. Contexte & point de départ

Une grande partie est **déjà en place** :

- **Serveur** : `dal_search_citations()` (FULLTEXT `IN BOOLEAN MODE` sur `contenu, notes, auteur_nom`) et `dal_find_citations()` exposent déjà les filtres œuvre / thème / auteur / état / dates / mots-clés, avec droits par rôle (`role_oeuvre_access`), soft-delete et pagination keyset. Endpoint `GET /api/citations?q=…&oeuvre_id=…&theme_id=…`.
- **Front** : la `Sidebar` (dans `MainLayout`) contient déjà l'emplacement — un champ « Rechercher dans le contenu… » **désactivé** et trois sections de filtres vides (Œuvres, Thèmes, Mots-clés). `AccueilPage` affiche les cartes via `apiClient.findCitations()` sans recherche ni filtre.
- **UI** : Radix (`@radix-ui/react-checkbox`, `react-popover`…) et `cmdk` déjà installés. Charte Phosphor + thème clair/sombre.

**Ce que T13 ajoute** = rendre la sidebar vivante (recherche + filtres Œuvre/Thème actifs) et faire que la liste de cartes affiche le résultat filtré.

## 2. Décisions (cadrage validé chef de projet)

| Sujet | Décision |
|---|---|
| Déclenchement recherche | **Au fil de la frappe**, debounce **~500 ms** après l'arrêt de frappe |
| Filtres retenus | **Œuvre** + **Thème** — l'auteur est **retiré** |
| Sélection par filtre | **Multi-valeurs**, cases à cocher (OU à l'intérieur d'un filtre) |
| Combinaison | Recherche texte **ET** œuvres **ET** thèmes (cumul pour affiner) |
| Thèmes hiérarchiques | Cocher un parent inclut ses sous-thèmes ; chaque sous-thème reste **décochable** (parent → état « partiel ») |
| Mise en page | **Sidebar de filtres conservée** (choix délibéré) ; listes à hauteur plafonnée pour rester visibles même sur petit écran |
| Mots-clés | Section laissée « à venir » (relève de T18) |
| Pagination | Première page (50). Pas de « charger plus » (→ T18) |

## 3. Comportement UX

- **Champ de recherche** activé (Phosphor `MagnifyingGlass`), contrôlé. Saisie → mise à jour des résultats ~500 ms après l'arrêt de frappe. Accent-insensible (déjà géré côté collation/FULLTEXT). Petit bouton « effacer » (×) quand non vide.
- **Filtre Œuvres** : liste de cases à cocher, plusieurs cochables. Compteur dans l'en-tête : « Œuvres (2) ».
- **Filtre Thèmes** : arborescence parent → sous-thèmes à cocher (2 niveaux max). Parent en case à trois états : cochée (parent + tous enfants sélectionnés), **partielle** (`indeterminate`, certains seulement), décochée.
- **Mots-clés** : en-tête conservé, contenu « À venir » discret (désactivé) — pas de logique en T13.
- **Réinitialiser** : visible dès qu'une recherche ou un filtre est actif ; vide tout d'un coup.
- **Résultats** : la liste de `CitationCard` existante affiche les résultats. Compteur « N résultat(s) ». Si plus d'une page (curseur suivant présent), note discrète « Affinez votre recherche pour préciser les résultats. » (le « charger plus » est T18).
- **États** : chargement (« Recherche… »), aucun résultat (« Aucune entrée ne correspond. »), erreur réseau.

### Mise en page responsive
- Grand écran : sidebar en colonne à gauche (comportement actuel `lg:w-64`).
- Petit écran : la sidebar devient une bande compacte en haut (`flex-col`, déjà en place). Pour que **tout reste visible**, chaque liste de filtre a une **hauteur plafonnée** avec défilement interne (`max-h-*` + `overflow-y-auto`) ; le champ de recherche et les en-têtes de section restent toujours visibles.

## 4. Architecture front

Problème : la `Sidebar` (recherche + filtres) et `AccueilPage` (résultats) sont deux composants séparés de la mise en page → ils doivent partager le même état.

**Solution : un contexte partagé `CorpusSearchProvider`** qui enveloppe le contenu de `MainLayout` (autour de `Sidebar` + `Outlet`). Il détient, à un seul endroit, l'état et la logique d'appel serveur (avec le debounce).

```
MainLayout
 └─ CorpusSearchProvider
     ├─ Sidebar         → écrit query / sélections, lit les référentiels
     └─ <Outlet/> (AccueilPage) → lit items / loading / error
```

État détenu :
- `query: string`
- `selectedOeuvreIds: number[]`
- `selectedThemeIds: number[]` (ids sélectionnés, parents **et** enfants confondus)
- Résultats : `items`, `loading`, `error`, `nextCursor`
- Référentiels chargés une fois : `oeuvres`, `themes`
- Actions : `setQuery`, `toggleOeuvre`, `toggleThemeNode`, `reset`

**Hook `useCorpusSearch()`** pour consommer. **Debounce ~500 ms** via une petite valeur dérivée (`useDebouncedValue`) sur `(query, selectedOeuvreIds, selectedThemeIds)` ; à chaque changement débouncé → un seul appel `apiClient.findCitations(params)`.

Construction des paramètres (fonction pure `buildCitationParams`, testable) :
- `q` = query (si non vide) ; sinon paramètre omis (le serveur bascule alors sur `dal_find_citations`).
- `oeuvre_ids` = liste séparée par virgules.
- `theme_ids` = liste séparée par virgules.

`apiClient.findCitations` accepte déjà un `Record<string,string>` → pas de changement de signature.

## 5. Extension serveur (filtres multi-valeurs)

Aujourd'hui le serveur ne filtre que sur **une** œuvre / **un** thème. Pour le multi-sélection, on ajoute la prise en charge de **listes** (clause SQL `IN (...)`), en gardant les paramètres singuliers existants pour compatibilité.

- `api/endpoints/citations.php` : lire `oeuvre_ids` / `theme_ids` (`explode(',', …)`) en plus de `oeuvre_id` / `theme_id`, pour les deux branches (`dal_search_citations` et `dal_find_citations`).
- `api/dal/citations.php` : dans les deux fonctions, si `oeuvre_ids` non vide → `c.oeuvre_id IN (:o0, :o1, …)` ; idem `theme_ids` → `c.theme_id IN (…)`. Paramètres **liés** un par un (jamais de concaténation d'entrée client) ; valeurs castées en `int`.
- Droits par rôle/œuvre (`dal_oeuvre_access_clause`), soft-delete et keyset : **inchangés**, continuent de s'appliquer.

### Hiérarchie des thèmes — résolue côté front
Le serveur n'a **pas** besoin de connaître l'arborescence : le front « déplie » le parent en ses enfants avant l'envoi. `theme_ids` arrive donc déjà comme une **liste plate** d'identifiants → `c.theme_id IN (...)`.

L'endpoint `themes` renvoie déjà `parent_id` (vérifié) → l'arbre est constructible côté écran.

Logique de sélection des thèmes (fonctions pures, unit-testées) :
- `buildThemeTree(themes)` : à partir de la liste plate (`id, nom, parent_id`).
- `toggleThemeNode(selection, tree, id)` :
  - sur un **parent** : s'il n'est pas entièrement sélectionné → ajoute `parent.id` + tous les `child.id` ; sinon → les retire tous.
  - sur un **enfant** : ajoute/retire ce seul `id` (le parent passe alors en « partiel », son `id` reste sélectionné tant qu'on ne le décoche pas).
- `getParentCheckState(selection, tree, parentId)` → `'checked' | 'indeterminate' | 'unchecked'`.

## 6. Découpage des unités (fichiers)

- `src/features/corpus/CorpusSearchProvider.tsx` — contexte + état + fetch débouncé.
- `src/features/corpus/useCorpusSearch.ts` — hook de consommation.
- `src/features/corpus/themeSelection.ts` — fonctions pures (arbre + toggle + état parent) **+ tests**.
- `src/features/corpus/buildCitationParams.ts` — construction des paramètres **+ tests**.
- `src/hooks/useDebouncedValue.ts` — debounce réutilisable **+ test**.
- `src/components/Sidebar.tsx` — réécrit : champ actif + filtres Œuvres/Thèmes + Réinitialiser.
- `src/features/accueil/AccueilPage.tsx` — consomme `useCorpusSearch()` au lieu de son propre fetch.
- `src/layouts/MainLayout.tsx` — enveloppe avec `CorpusSearchProvider`.
- Serveur : `api/endpoints/citations.php`, `api/dal/citations.php`.

## 7. Tests

- **Vitest (unit)** : `buildThemeTree`, `toggleThemeNode` (parent ↔ enfants, décochage enfant), `getParentCheckState` (3 états), `buildCitationParams`, `useDebouncedValue`.
- **Composant** : Sidebar — cocher une œuvre / un thème déclenche la mise à jour ; bouton Réinitialiser vide tout.
- **Manuel / API** : recherche accent-insensible (« ame » trouve « âme ») ; cumul recherche + œuvres + thèmes ; un **Abo3** ne voit que ses œuvres autorisées (droits en SQL).
- Quality gate : `pnpm lint`, `pnpm build`, `php -l` sur les fichiers PHP touchés.

## 8. Accessibilité (plancher)

- Navigation clavier sur champ + cases + bouton ; focus visible.
- `aria-label` sur le champ de recherche ; cases liées à leur libellé ; libellé explicite sur Réinitialiser ; `aria-checked="mixed"` pour le parent partiel.
- Contraste WCAG AA (tokens de thème existants) ; pas d'animation superflue (respect `prefers-reduced-motion`).

## 9. Hors périmètre T13 (rappel)

Renvoyés à **T17/T18** : mots-clés ET/OU, « charger plus » / pagination front, virtualisation au-delà de 200 résultats, badges de filtres actifs supprimables, mémorisation des filtres dans l'URL, total exact filtré.
