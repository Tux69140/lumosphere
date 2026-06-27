# T12 — Contenu principal page d'accueil : cartes de citations — Design

> Spec issue du brainstorming des 25–26/06/2026. Source devbook : Dev §II.1.
> Prérequis : T08 (squelette React), T10 (données de test). Débloque : T13 (recherche).

## Objectif

Enrichir le **contenu principal de la page d'accueil** de Lumosphère : la liste de cartes de citations affichées en lecture. Faire passer l'affichage du squelette T08 (texte brut) à une carte conforme à la « carte d'entrée » du cahier des charges (§13).

> Note terminologique : cette page est la **page d'accueil**, pas la section « Bibliothèque » (qui est un lien de navigation distinct). Voir mémoire `project_terminologie-bibliotheque`.

## Référence visuelle (décision 26/06/2026)

Le visuel de la carte **reprend le template du site de démo** `Archives/Telegram/AIStudio/frontend/src/components/ResultCard.tsx`, **adapté** :
- Couleurs → nos **tokens** `--color-*` de `src/index.css` (charte `charte_couleurs-lumosphere.md`), jamais de couleurs en dur. Rappel : en mode clair l'action est verte `#2b4f35` et l'accent doré `#D3B67B` ; en mode sombre ces mêmes rôles deviennent indigo `#818cf8` et orange `#fb923c`. On utilise les tokens, pas les valeurs.
- Icônes → **Phosphor** (`@phosphor-icons/react`, déjà installé), jamais les SVG dessinés à la main de la démo.
- Format texte → **Markdown** (pas le HTML brut injecté de la démo).

On ne copie pas le code de la démo (règle `conventions.md`) : on reproduit la **mise en page** avec notre stack.

## Périmètre

T12 ne fait que **l'affichage en lecture** de la carte. La recherche/les filtres (T13), les droits fins par rôle/état dans la DAL (T14), l'activation réelle des favoris (T19) et de l'édition (T20) sont hors périmètre.

> Calage page-niveau (barre de menu, sidebar de recherche, pagination) sur le template : suivi dans les tâches ultérieures de la trame, pas en T12.

## État de l'existant (vérifié le 26/06/2026)

- **API** : `GET /api/citations` (via `dal_find_citations`) renvoie déjà pour chaque entrée : `contenu`, `notes`, `oeuvre_nom`, `theme_nom`, `etat_nom`, `auteur_nom`, dates et `mots_cles[]`. **Aucune modification API nécessaire.**
- **Front** : `src/features/accueil/AccueilPage.tsx` charge les citations et les liste ; `src/components/CitationCard.tsx` affiche un sous-ensemble (thème, contenu brut, auteur, mots-clés). Le type `Citation` côté front est incomplet (pas d'œuvre ni de notes).
- **Tokens couleurs** : déjà câblés dans `src/index.css` (mode clair + sombre).
- **Phosphor** : `@phosphor-icons/react` déjà en dépendance — pas d'installation d'icônes nécessaire.

## Carte de citation — composition finale

Mise en page calquée sur la démo, de haut en bas :

1. **En-tête** (ligne, `justify-between`) :
   - à gauche : **thème/sous-thème** (chemin `Parent > Enfant` si sous-thème) ;
   - à droite : **œuvre**, en couleur d'accent.
2. **Contenu** : rendu en **Markdown** (complet, non tronqué).
3. **Auteur** : affiché **uniquement si différent de « Lulumineuse »** (inutile de répéter l'autrice principale).
4. **Notes de publication** : sous le texte, **séparées par un fin filet**, style discret « note de bas de page » (texte plus petit), rendues en Markdown, **affichées seulement si non vides**.
5. **Pied de carte** (séparé par un fin filet) :
   - à gauche : **mots-clés** en badges, **non cliquables** en v1 (clic-pour-filtrer → T13) ;
   - à droite : **emplacement réservé** pour les boutons **Favori** (icône cœur) et **Éditer** (icône crayon), **désactivés/inertes** en T12. L'icône Éditer n'est rendue que pour les rôles **éditeur/admin** (`canEdit`) ; le favori est visible par tous. Activation réelle en T19/T20.

**Volontairement absent :**
- **État** (À Corriger / À Réviser / Publiée) : jamais affiché sur cette page, pour aucun rôle. Voir mémoire `project_droits-visibilite-etats`.

## Décisions techniques

**Rendu Markdown :** bibliothèque `react-markdown` + `remark-gfm` (tables GFM, conforme à `frontend.md` : « Source format CommonMark + GFM tables »). `react-markdown` n'interprète pas le HTML brut par défaut → pas de risque d'injection (`rehype-raw` volontairement non utilisé).

**Chemin de thème :** le chemin `Parent > Enfant` est calculé côté PHP (règle `database.md` : « path computed in PHP »). En T12 on affiche `theme_nom` tel que fourni par l'API ; si la DAL ne renvoie pas encore le chemin complet, affichage du libellé simple (pas de régression), à compléter côté DAL plus tard si besoin.

**Auteur conditionnel :** comparaison exacte `auteur_nom !== 'Lulumineuse'` (et non vide).

**Notes conditionnelles :** affichées seulement si `notes` est une chaîne non vide après trim.

**Boutons pied de carte :** rendus en `<button disabled>` (honnête : visibles mais inactifs), `title`/`aria-label` explicites. Icônes Phosphor : `Heart` (favori), `PencilSimple` (éditer). Aucun handler branché en T12.

**Couleurs :** uniquement via tokens `--color-*` (jamais `slate-*`/`orange-*`/`indigo-*` en dur), pour respecter la charte et le mode sombre.

## Fichiers touchés

| Fichier | Action | Rôle |
|---|---|---|
| `src/components/CitationCard.tsx` | Modify | Mise en page type démo : en-tête thème+œuvre, rendu Markdown, auteur conditionnel, notes, pied de carte (badges + boutons inertes Phosphor) |
| `src/features/accueil/AccueilPage.tsx` | Modify | Compléter le type `Citation` (œuvre, notes), transmettre les champs + `canEdit` à la carte |
| `src/components/__tests__/CitationCard.test.tsx` | Create | Tests unitaires de la carte |
| `package.json` | Modify | Ajouter `react-markdown` et `remark-gfm` |

## Interface du composant

```ts
type CitationCardProps = {
  contenu: string
  oeuvre_nom: string | null
  theme_nom: string | null
  auteur_nom: string | null
  notes: string | null
  mots_cles: string[]
  canEdit?: boolean // true pour éditeur/admin → affiche le bouton Éditer (inerte en T12)
}
```

Le type `Citation` dans `AccueilPage.tsx` ajoute `oeuvre_nom: string | null` et `notes: string | null`.

## Tests (Vitest + Testing Library)

1. L'**œuvre** s'affiche dans l'en-tête quand fournie.
2. Le **thème** s'affiche dans l'en-tête quand fourni.
3. Le **Markdown est rendu** : `**gras**` produit un élément `<strong>`.
4. L'**auteur** n'apparaît **pas** quand `auteur_nom === 'Lulumineuse'`.
5. L'**auteur** apparaît quand `auteur_nom` est un autre nom.
6. Les **notes** n'apparaissent **pas** quand `notes` est null ou vide.
7. Les **notes** apparaissent (rendu Markdown) quand non vides.
8. L'**état** n'apparaît **jamais** (aucun texte d'état dans le rendu).
9. Les **mots-clés** s'affichent en badges (non cliquables : pas de `button`/handler de clic).
10. Le bouton **Favori** est présent mais **désactivé**.
11. Le bouton **Éditer** est présent (désactivé) quand `canEdit` est vrai, **absent** sinon.

## Vérification manuelle

- `pnpm build` passe.
- L'écran d'accueil affiche les 106 citations avec œuvre + thème en en-tête, contenu mis en forme, auteur masqué pour Lulumineuse, mots-clés en badges, pied de carte avec boutons inertes — visuellement proche de la démo mais aux couleurs Lumosphère.

## Hors périmètre (YAGNI)

- Recherche plein texte et filtres (thème/œuvre/auteur/mots-clés) → T13.
- Filtrage par droits rôle/œuvre/état dans la DAL → T14.
- Mots-clés cliquables (filtrage au clic) → T13.
- Troncature « lire la suite » → ultérieur si nécessaire.
- Activation réelle des favoris → T19 ; lien/page d'édition → T20.
- Calage du reste de la page (menu, sidebar de recherche, pagination) sur le template → tâches ultérieures de la trame.
