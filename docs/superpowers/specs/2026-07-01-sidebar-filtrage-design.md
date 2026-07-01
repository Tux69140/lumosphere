# Perfectionnement de la sidebar de filtrage — conception

**Date** : 2026-07-01
**Périmètre** : feature `corpus` (bibliothèque / recherche). Écran = `Sidebar.tsx` + `CorpusFilters.tsx` ; serveur = mode ET des thèmes.

## Objectif

Rendre la sidebar de filtrage entièrement visible (pied fixe qui ne déborde jamais), harmoniser la combinaison OU / ET, et rendre le bouton Réinitialiser permanent.

## Décisions validées

1. **Œuvres = OU uniquement.** Une citation appartient à une seule œuvre (`citations.oeuvre_id`, `not null`). Un mode « ET » sur les œuvres renverrait toujours zéro résultat → on ne l'affiche pas. Pas de toggle sur la section Œuvres.
2. **Thèmes = OU uniquement.** Correction post-validation : une citation n'a qu'**un seul** thème (`citations.theme_id`, nullable, **pas** de table de liaison contrairement aux mots-clés — cf. `docs/_reference/index-corpus-schema/schema_T0.2_v4_sources_simple.dbml:85`). Un mode « ET » y renverrait donc toujours zéro résultat, exactement comme pour les œuvres. Pas de toggle sur la section Thèmes ; aucun changement serveur nécessaire pour les thèmes.
3. **Mots-clés = OU / ET.** Seule section combinable : une citation peut avoir plusieurs mots-clés (table `citation_keywords`, plusieurs-à-plusieurs). Déjà existant, conservé tel quel — juste harmonisé visuellement (toggle toujours visible, plus besoin d'avoir déjà coché un mot-clé).
4. **Bouton Réinitialiser permanent.** Toujours affiché dans le pied fixe. **Grisé/inactif** quand aucun filtre n'est actif (option la plus fiable) ; cliquable dès qu'un filtre est posé.
5. **Pied de sidebar** : logo Lulumineuse + lien, sous le bouton Réinitialiser. Pas de crédit Biovibralyon.

## A. Structure & visibilité

La sidebar devient une **colonne flex en 3 zones**, calée sous le header (`sticky top-16`, hauteur bornée à `calc(100vh - 4rem)`) :

- **Corps (défilant)** : `flex-grow overflow-y-auto` — recherche texte, tri, œuvres, thèmes, mots-clés, période. Seule partie qui défile.
- **Pied (fixe)** : `flex-shrink-0` — bouton Réinitialiser + crédit Lulumineuse. Toujours visible, quelle que soit la hauteur d'écran.

Conséquences :
- Le pied ne déborde jamais hors de l'écran.
- On conserve une hauteur max raisonnable par liste (œuvres / thèmes / mots-clés) pour éviter qu'une seule liste ne monopolise le défilement, mais l'imbrication de défilements reste maîtrisée (un seul défilement principal = le corps).
- Comportement mobile inchangé (toggle `filtersOpen` existant).

## B. Combinaison OU / ET

Seule la section combinable (mots-clés) affiche, **en permanence dans son en-tête**, deux pastilles **OU** / **ET** (plus de condition « au moins un élément coché » pour l'affichage).

- **Œuvres** : aucun toggle (OU implicite, une citation = une seule œuvre).
- **Thèmes** : aucun toggle (OU implicite, une citation = un seul thème). Aucun changement serveur.
- **Mots-clés** : `keywordMode` existant conservé tel quel côté état/serveur ; seule la condition d'affichage change (toggle toujours visible dans l'en-tête de section, plus besoin d'un mot-clé déjà coché).

## C. Réinitialiser & pied

- **Réinitialiser** : rendu inconditionnel dans le pied. `disabled` (grisé) quand `hasActiveFilters` est faux. `onClick={reset}` → vide l'URL (`resetAll`).
- **Crédit** : un seul lien (logo + « D'après les partages de Lulumineuse »), vers le site Lulumineuse. Logo à ajouter aux assets Lumosphère.

## Fichiers impactés

Écran uniquement (aucun changement serveur requis) :
- `src/components/Sidebar.tsx` — layout 3 zones (corps défilant + pied fixe).
- `src/components/CorpusFilters.tsx` — toggle mots-clés toujours visible, bouton Réinitialiser permanent (`disabled` piloté par `hasActiveFilters`), pied avec crédit Lulumineuse.

Aucun changement de types, d'état URL, de contexte ou de `buildCitationParams` : la structure de filtres existante (`CorpusFilters` dans `types.ts`, `useUrlFilterState`, `CorpusSearchContext`/`Provider`) reste inchangée.

## Tests

- Unitaires (Vitest) : le toggle OU/ET mots-clés s'affiche même sans sélection ; le bouton Réinitialiser est rendu avec `disabled=true` quand `hasActiveFilters` est faux et `disabled=false` sinon ; `onClick` déclenche bien `reset` uniquement quand actif.
- E2E (Playwright) : le pied (bouton + crédit) reste visible sans avoir à faire défiler la page, sur un viewport bas ; clic sur Réinitialiser vide bien les filtres actifs.
- Non-régression : recherche existante (œuvres OU, thèmes OU, mots-clés OU/ET) inchangée — aucun changement de comportement de recherche, uniquement de présentation.

## Hors périmètre

- Pas de mode ET sur les œuvres, ni sur les thèmes (limitation structurelle : une citation a une seule œuvre et un seul thème).
- Pas de migration de schéma pour rendre les thèmes multi-valués.
- Pas de refonte des autres filtres (tri, période, favoris, recherche texte) au-delà de leur intégration dans le corps défilant.
