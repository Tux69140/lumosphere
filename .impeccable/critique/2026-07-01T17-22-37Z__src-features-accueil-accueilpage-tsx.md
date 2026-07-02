---
target: page d'accueil
total_score: 28
p0_count: 0
p1_count: 4
timestamp: 2026-07-01T17-22-37Z
slug: src-features-accueil-accueilpage-tsx
---
## Design Health Score

| # | Heuristique | Note | Enjeu clé |
|---|-------------|------|-----------|
| 1 | Visibilité de l'état | 3 | Skeletons + compteur `aria-live` bons ; barre de compte à moitié vide |
| 2 | Correspondance monde réel | 3 | Vocabulaire métier FR juste ; labels tout-majuscules un peu SaaS |
| 3 | Contrôle & liberté | 4 | Pills retirables, X recherche, Réinitialiser, « Effacer les filtres » |
| 4 | Cohérence & standards | 2 | Survol indigo + mode sombre hors-marque + header ombré |
| 5 | Prévention d'erreur | 3 | Reset désactivé si aucun filtre ; peu d'actions destructrices |
| 6 | Reconnaissance vs rappel | 3 | Filtres actifs en pills + compteurs ; pas de titre de contexte |
| 7 | Flexibilité & efficacité | 3 | Tri, ET/OU, favoris, virtualisation ; scroll imbriqué, zéro raccourci |
| 8 | Esthétique & minimalisme | 2 | Barre de résultats à vide ; trois blancs ; sombre off-brand |
| 9 | Récupération d'erreur | 2 | Bandeau sans `role="alert"` ni bouton Réessayer |
| 10 | Aide & documentation | 3 | HelpButton en header + états vides explicatifs |
| **Total** | | **28/40** | **Bon — fondation solide, zones faibles à traiter** |

## Anti-Patterns Verdict

**LLM** : en mode clair la page tient le brief (sobre, artisanale, la CitationCard s'efface devant le texte). Mais deux zones trahissent un reste de template : le **survol indigo** du bouton vert et **tout le mode sombre** (indigo/orange/slate) — soit exactement l'anti-référence « violet/bleu startup » explicitement bannie. Plus quelques tells SaaS mineurs (header ombré, eyebrows majuscules, barre de compte vide).

**Scan déterministe** : `detect.mjs` sur les 8 fichiers de l'arbre → **0 finding** (exit 0). Aucun tell structurel (bordure latérale, gradient text, glassmorphism, grille de cartes identiques, débordement). Cohérent : le problème ici est sémantique/marque, pas structurel — le détecteur ne lit pas les valeurs de tokens.

**Overlays visuels** : non disponibles — aucun serveur de dev en cours et backend PHP absent, donc pas d'injection navigateur fiable. Revue faite sur le code JSX/CSS et les tokens.

## Overall Impression
La carte de citation est excellente ; c'est le **cadre autour** qui déçoit — palette de survol/mode sombre hors-marque, texte sans largeur de lecture, et une barre de résultats qui ressemble à une carte KPI oubliée. Plus grande opportunité : remettre la palette dans le vert+or de marque et faire respirer le texte.

## What's Working
1. **CitationCard exemplaire** (`CitationCard.tsx:38-49`) : plate à bordure, seule ombre autorisée (`shadow-sm→md`), œuvre en or-encre lisible (`--color-accent-ink`), thème discret, chips atténuées. L'interface recule.
2. **Transparence des filtres** : pills retirables une à une (`ResultsInfoBar.tsx:72-110`), compteurs par section, cases tri-état parent/enfant, Reset conditionné à `hasActiveFilters`.
3. **États chargement/vide/erreur structurels** : skeleton à géométrie identique (zéro reflow), messages de vide différenciés avec action de sortie.

## Priority Issues

### [P1] Système chromatique hors-marque (survol indigo + mode sombre)
- **Quoi** : `--color-action-hover: #4338ca` (indigo) en clair ; en sombre tout le système d'action = indigo `#818cf8/#6366f1`, l'or devient orange `#fb923c`, tags indigo (`index.css:55,90-97`).
- **Pourquoi** : c'est l'anti-référence explicite du projet. Un bouton vert qui vire indigo au survol lit comme un bug ; le mode sombre ne ressemble plus à Lumosphère.
- **Fix** : `action-hover` clair = vert plus foncé (~`#22402b`). Sombre dérivé du vert/or de marque. Bannir indigo/orange des tokens.
- **Commande** : `/impeccable colorize`

### [P1] « Favoris » or illisible sur header crème + cases natives bleues
- **Quoi** : `Header.tsx:56` lien Favoris actif = `text-(--color-accent)` (#d3b67b) sur header `#fdf7f1` → contraste ~1,8:1, illisible. DESIGN.md interdit pourtant l'or en couleur de texte. Cases à cocher sans `accent-color` → bleu OS (`CorpusFilters.tsx:114+`).
- **Pourquoi** : échec WCAG franc sur un élément de navigation ; troisième couleur non planifiée dans la sidebar.
- **Fix** : Favoris actif en `--color-accent-ink` (#8a6d2f) comme le cœur de la carte ; poser `accent-color: var(--color-action)` sur les cases.
- **Commande** : `/impeccable colorize`

### [P1] Aucune largeur de lecture : le texte court sur 1400px
- **Quoi** : contenu mono-colonne dans `max-w-[90rem]` (`AccueilPage.tsx:62`), `.prose-display` sans `max-width`. Lignes >100 caractères sur desktop.
- **Pourquoi** : « Le texte est la matière première » — au-delà de ~66ch le confort de lecture chute, sur le cœur même du produit.
- **Fix** : plafonner la mesure du bloc citation (`max-w-[68ch]`), méta haut/bas peuvent rester larges.
- **Commande** : `/impeccable layout`

### [P1] Accessibilité lecteur d'écran
- **Quoi** : citations en `<article>` sans nom accessible (`CitationCard.tsx:38`) → « article, article… » sans repère ; saut de titres `h1` sr-only → `h3` filtres (aucun `h2`) ; bandeau d'erreur sans `role="alert"` ni bouton Réessayer (`AccueilPage.tsx:66`).
- **Pourquoi** : navigation par landmark/heading inutilisable ; erreur potentiellement non annoncée et sans issue.
- **Fix** : `aria-label` sur l'article (œuvre/thème), hiérarchie de titres continue, `role="alert"` + bouton Réessayer (`refresh`).
- **Commande** : `/impeccable harden`

### [P2] Chrome bavard : barre de résultats vide, header ombré, scroll imbriqué
- **Quoi** : `ResultsInfoBar.tsx:61-70` cadre bordé 58px à moitié vide (`<div flex-1 />` + badge à droite) ; `Header.tsx:107` `shadow-sm` (interdit) ; titres filtres `uppercase` (`CorpusFilters.tsx:17`) ; virtualisation en conteneur `height:80vh` dans la page déjà scrollable (`AccueilPage.tsx:100`).
- **Pourquoi** : premier élément = conteneur presque vide (anti-minimaliste, mange le haut mobile) ; tells SaaS ; double barre de défilement.
- **Fix** : compteur en simple ligne de texte alignée à gauche sans cadre ; retirer `shadow-sm` du header ; titres en casse normale ; `useWindowVirtualizer` au lieu du conteneur à hauteur fixe.
- **Commande** : `/impeccable distill`

## Persona Red Flags

**Casey (lectrice découverte, mobile, mode sombre téléphone)** : premier élément = cadre de compte quasi vide de 58px qui repousse la première citation sous la ligne de flottaison ; en sombre, vert+or remplacés par indigo+orange ; au-delà de 200 résultats, piège de scroll 80vh sur petit écran. La recherche est enfouie derrière le bouton « Filtres ».

**Alex (éditrice power-user, desktop large)** : lignes de citation à 1000px+ toute la journée ; chaque survol de bouton clignote en indigo (lit comme un défaut) ; double barre de défilement sur grand corpus ; zéro raccourci clavier ; cases bleu OS qui jurent avec le vert.

**Sam (lecteur d'écran)** : citations `<article>` anonymes, navigation par titre impossible ; saut `h1`→`h3` ; bandeau d'erreur sans `role="alert"` ni récupération.

## Minor Observations
- Trois quasi-blancs (header crème `#fdf7f1`, page menthe `#f8fefc`, sidebar froide `#f8fafc`) ; la sidebar froide jure avec le registre chaud.
- `--color-text-placeholder: #64748b` (slate institutionnel) sert de couleur par défaut du cœur favori.
- Tokens orphelins hors-palette : `--color-accent-text: #9a3412`, sombre `--color-accent-bg: #000040`.
- Scroll infini sans message de fin de corpus (`AccueilPage.tsx:163`).
- Aucun masthead/titre visible sur la vue corpus (seulement `h1` sr-only).

## Questions to Consider
1. La moitié gauche vide de la ResultsInfoBar (`<div flex-1 />`) est-elle un vestige d'une barre de recherche déménagée ? Pourquoi garder le cadre plutôt qu'une ligne de texte ?
2. Le mode sombre indigo/orange est-il validé par la marque ou hérité d'un template ? C'est le plus gros écart au brief.
3. Une revue littéraire laisse-t-elle vraiment courir le texte sur 1400px ?
4. Le survol indigo du bouton vert est-il intentionnel, ou un reste de `indigo-700` Tailwind non revu ?
5. Faut-il un fil de contexte visible (« Bibliothèque · 1 240 citations ») en tête de colonne ?
