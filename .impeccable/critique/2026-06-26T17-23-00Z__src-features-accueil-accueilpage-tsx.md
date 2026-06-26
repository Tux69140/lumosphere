---
target: écran des citations (cartes + page d accueil)
total_score: 25
p0_count: 0
p1_count: 1
timestamp: 2026-06-26T17-23-00Z
slug: src-features-accueil-accueilpage-tsx
---
# Critique — Écran des citations (cartes + page d'accueil)

## Verdict anti-patterns : pas de slop
Système de design distinctif et assumé (économie or + vert, neutres chauds, chrome plat). Détecteur : seul un border-left sur blockquote Markdown (légitime) + Inter (choix d'identité). Pas de tell IA.

## Heuristiques de Nielsen — 25/40 (Acceptable)
1. Visibilité de l'état — 2 : pas de squelette au chargement, zone vide, pas d'aria-live.
2. Langage — 3 : français naturel ; suffixe « + » du compteur obscur.
3. Contrôle & liberté — 3 : pastilles retirables, reset, croix d'effacement.
4. Cohérence — 2 : mots-clés des cartes colorés comme les filtres (CitationCard.tsx:71) ; ResultsInfoBar a une ombre (chrome doit être plat).
5. Prévention d'erreur — 3.
6. Reconnaissance — 3 : filtres visibles, filtres actifs en pastilles.
7. Flexibilité — 2 : pas de raccourcis clavier ni recherche sauvegardée.
8. Esthétique — 3 : deux icônes grisées inertes par carte ; barre de résultats lourde pour un compteur.
9. Récupération d'erreur — 2 : message générique.
10. Aide — 2 : quasi inexistante.

## Ce qui marche
- Identité forte et cohérente (or = œuvre, vert = actions).
- Filtres actifs en pastilles retirables (ResultsInfoBar).
- Vrai mode sombre (re-thématisation, pas inversion).

## Problèmes prioritaires
[P1] Or Parchemin illisible sur blanc — CitationCard.tsx:37 (nom d'œuvre) et CorpusFilters.tsx:133 (Réinitialiser). Contraste ~1,95:1 vs 4,5:1 requis. Fix : or « encre » foncé pour le texte, ou or réservé aux pastilles non-textuelles. → colorize/polish.
[P2] Aucun squelette de chargement ; zone vide pendant l'attente — AccueilPage.tsx. Registre product = squelettes. → harden/polish.
[P2] Deux icônes grisées inertes sur chaque carte — CitationCard.tsx:78-97. Fausse affordance répétée. Fix : masquer tant qu'inactif. → distill.
[P2] État vide non instructif — AccueilPage.tsx:24. Ne distingue pas corpus vide / aucun résultat ; pas de bouton effacer filtres. → onboard.

## Drapeaux personas
- Sam (clavier/lecteur d'écran) : pas de h1 (hiérarchie démarre à h3 en sidebar) ; compteur non annoncé (pas d'aria-live) ; focus:outline-none sans remplacement (ResultsInfoBar.tsx:20).
- Casey (mobile) : sidebar de filtres en haut, longue à dérouler avant les citations.
- Riley (cas limites) : cartes tiennent bien (citation longue, tableau Markdown) ; pas de « voir plus » sur citation fleuve.

## Questions
- L'or reste-t-il la couleur du nom d'œuvre (illisible) ou devient-il une pastille, l'œuvre passant en texte foncé ?
- Favori/éditer visibles « à venir » ou masqués jusqu'à activation ?

## Audit technique — 15/20 (Bon)
- Accessibilité 2 : contraste or P1 ; focus invisible ; pas de h1/aria-live ; champ recherche sans focus ring.
- Performance 3 : débounce, IntersectionObserver, rendu léger.
- Responsive 3 : sidebar repliable ; cibles tactiles icônes ~32px.
- Thématisation 3 : tokens OK, vrai dark mode, mais #f1f5f9 codé en dur (CitationCard.tsx:64) = bug dark mode.
- Anti-patterns 4 : aucun tell IA.
