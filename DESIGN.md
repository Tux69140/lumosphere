---
name: Lumosphère
description: Index interactif des ressources proposées par Lulumineuse — bibliothèque éditoriale de citations spirituelles
colors:
  action: "#2b4f35"
  action-hover: "#4338ca"
  action-text: "#ffffff"
  accent: "#d3b67b"
  accent-bg: "#ffffdf"
  accent-text: "#9a3412"
  accent-ink: "#7a5f28"
  bg-page: "#f8fefc"
  bg-card: "#ffffff"
  bg-sidebar: "#f8fafc"
  bg-field: "#ffffff"
  bg-button: "#fff4f4"
  text-primary: "#3d3a35"
  text-secondary: "#706b63"
  text-placeholder: "#64748b"
  border: "#e2e8f0"
  tag-bg: "#ececff"
  tag-text: "#4338ca"
  danger: "#dc2626"
  danger-bg: "#fee2e2"
  danger-text: "#991b1b"
  success-bg: "#dcfce7"
  success-text: "#166534"
  warning: "#d97706"
  warning-bg: "#fef3c7"
  warning-text: "#92400e"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-text}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.action-text}"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.action-text}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  button-ghost-hover:
    backgroundColor: "{colors.bg-button}"
    textColor: "{colors.text-primary}"
  card:
    backgroundColor: "{colors.bg-card}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.bg-field}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  tag-filter:
    backgroundColor: "{colors.tag-bg}"
    textColor: "{colors.tag-text}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  tag-keyword:
    backgroundColor: "{colors.bg-sidebar}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    padding: "4px 8px"
---

# Design System: Lumosphère

## 1. Overview

**Creative North Star: "La Lumosphère : Index interactif des ressources proposées par Lulumineuse"**

Lumosphère est une interface de travail au service d'un corpus vivant de citations spirituelles. Sa personnalité visuelle est celle d'une revue indépendante de qualité : soignée sans être institutionnelle, dense sans être surchargée. Le design ne se montre pas — il s'efface pour laisser les citations occuper tout l'espace qu'elles méritent. Chaque décision visuelle répond à une seule question : est-ce que ça aide à lire, à trouver, à valider ?

La chaleur du système naît de deux couleurs seulement : un **Or Parchemin** qui marque ce qui compte (titres d'œuvres, sélections, accents), et un **Vert Éditorial** sombre pour toutes les actions. Le reste est de l'encre sur du papier — fond quasi-blanc légèrement teinté de vert végétal, textes bruns-chauds, bordures argentées discrètes. En mode sombre, le Vert Éditorial devient un **Vert Nuit** (`#3f7a54`, rappel du bandeau de marque) et l'Or Parchemin (`#d3b67b`) reste identique au mode clair — les deux couleurs identitaires sont **ancrées sur la marque dans les deux modes**, plutôt que pivotées vers l'indigo/orange (choix précédent, abandonné). Seul le survol des actions (`--color-action-hover`) reste un indigo distinct, assumé comme signal de changement d'état.

La surface de lecture (accueil/bibliothèque) porte en plus une intention **contemplative et apaisée** : le contenu étant des citations spirituelles, le rythme de lecture y est délibérément ralenti — respiration généreuse, pas de course à la densité. Cette respiration reste propre à la surface lecteur ; elle ne s'étend pas à l'admin ni à l'atelier, qui restent denses et efficaces (§ Users, PRODUCT.md).

Ce système refuse explicitement : le blanc aseptisé SaaS (Notion/Linear), le gris institutionnel des archives académiques, les grilles de KPI analytics, les hero sections marketing avec animations de scroll, et l'esthétique de site paroissial ou associatif daté (couleurs criardes, mise en page chargée, iconographie religieuse clichée — colombes, mandalas, halos).

**Key Characteristics:**
- Économie chromatique : deux couleurs-clés (or + vert), le reste en neutres chauds
- Typographie unique (Inter) déclinée en poids et tailles — pas de serif, pas de display extravagant
- Élévation réservée aux contenus interactifs (cartes de citations) ; l'UI chrome reste plate
- Deux modes (clair/sombre/auto) avec des palettes distinctes, pas de simples inversions
- Mode administrateur visuellement distinct dans son densité et sa structure, mais dans la même charte

## 2. Colors: La Palette Parchemin

Un système à économie chromatique : deux couleurs identitaires sur un fond de neutres chauds.

### Primary
- **Vert Éditorial** (`#2b4f35`): La couleur de toutes les actions primaires, états actifs de navigation, liens interactifs et cases à cocher (`accent-color: var(--color-action)`). Sombre et organique, il ancre les gestes sans s'imposer. En mode sombre, son équivalent fonctionnel est le **Vert Nuit** (`#3f7a54`, rappel du bandeau de marque, contraste texte blanc ~5,1:1) — remplace l'ancien Indigo Doux (`#818cf8`). Le survol (`--color-action-hover`) reste un indigo distinct dans les deux modes (`#4338ca` clair / `#6366f1` sombre) : transition volontairement contrastée, choix de marque assumé — ce n'est **pas** une incohérence à corriger.
- **Or Parchemin** (`#d3b67b`): L'accent identitaire. Réservé aux éléments **non-textuels** qui méritent d'être remarqués : icône de logo, badges de sélection, puces d'accent, fonds de pastilles. Jamais utilisé sur plus de 10 % d'un écran donné. **Ne jamais l'utiliser comme couleur de texte** (contraste ~1,95:1 sur blanc — illisible). Identique en mode sombre (`--color-accent`) — remplace l'ancien orange (`#fb923c`), pour ancrer l'identité de marque dans les deux modes plutôt que de la faire pivoter.
- **Or Encre** (`#d3b67b` clair → `#7a5f28`): Version foncée de l'Or Parchemin, **réservée au texte** qui doit rester or (noms d'œuvres dans les cartes, lien « Réinitialiser », lien « Favoris » actif du header). Token `--color-accent-ink`. Contraste ~5,7:1 sur blanc/crème (WCAG AA ✓, renforcé depuis l'ancien `#8a6d2f`). En mode sombre, `--color-accent-ink` reprend directement la valeur de l'Or Parchemin (`#d3b67b`, ~7,5:1 sur fond de carte `#1e293b`) — plus besoin d'un orange de repli.

### Secondary
- **Indigo Marqueur** (`#4338ca`): Couleur des tags de filtrage et état hover sur les actions. Apparaît dans `--color-tag-text` et `--color-action-hover`. Transition inattendue du vert vers l'indigo au hover — signal de changement d'état net et délibéré.

### Neutral
- **Blanc Végétal** (`#f8fefc`): Fond de page — blanc avec une légère teinte verte froide. Pas crème, pas ivoire : une nuance propre au projet.
- **Blanc Pur** (`#ffffff`): Surfaces de cartes et champs de formulaire. Le léger contraste avec le fond de page crée de la profondeur sans ombre.
- **Givre Pâle** (`#f8fafc`): Sidebar et surfaces secondaires (ex. fond des mots-clés dans les cartes).
- **Encre Chaude** (`#3d3a35`): Texte principal. Brun-noir légèrement chaud — jamais le noir pur, jamais le gris froid.
- **Étain Tiède** (`#706b63`): Texte secondaire, métadonnées, descriptions. Toujours ≥ 4,5:1 sur fond blanc.
- **Ardoise** (`#64748b`): Placeholders, labels inactifs. Vérifier le contraste avant usage sur fond teinté.
- **Voile Argenté** (`#e2e8f0`): Toutes les bordures et séparateurs. Un seul token pour toute la hiérarchie de division.

### Named Rules
**La Règle du Un Dix Pourcent.** L'Or Parchemin apparaît sur ≤ 10 % de n'importe quel écran. Sa rareté fait sa valeur. Utiliser l'or pour "décorer" détruit l'effet.

**La Règle Anti-Gris Froid.** Lumosphère est warm-neutral. Aucun gris pur (#888888) dans le texte ni dans les fonds. Chaque neutre tire vers le brun chaud (textes) ou vers le vert froid très léger (fonds). Les deux directions se rencontrent à la frontière — jamais en plein milieu.

## 3. Typography

**Corps principal :** Inter, system-ui, sans-serif — un seul caractère pour tous les rôles.

**Caractère :** Inter seul suffit. La lisibilité du corpus exige une typographie fonctionnelle, non décorative. Les variations de poids et de taille créent toute la hiérarchie nécessaire. Pas de serif display, pas de pairing à deux familles : la densité d'information d'une bibliothèque éditoriale s'accommode mal des changements de registre typographique.

### Hierarchy
- **Display** (700, 1.5rem/24px, line-height 1.3, letter-spacing -0.01em): Titres de pages admin (`<h1>`). Deux ou trois mots max. `text-wrap: balance`.
- **Headline** (600, 1.25rem/20px, line-height 1.35): Sous-titres de sections, titres alternatifs de pages.
- **Title** (600, 1rem/16px, line-height 1.4): Titres de panneaux, intitulés de groupes, noms de rôles dans l'admin.
- **Body** (400, 0.875rem/14px, line-height 1.6): Tout le contenu de l'interface — cartes, formulaires, listes, navigation. Max 65–75ch pour les colonnes de texte.
- **Label** (500, 0.75rem/12px, letter-spacing 0.05em): Métadonnées, mots-clés, en-têtes de groupes de permissions en petites capitales. `uppercase` + `tracking-widest` dans l'admin pour les séparateurs de sections.

### Named Rules
**La Règle Mono-Famille.** Une seule famille dans toute l'application. Jamais d'introduction d'un serif ou d'un monospace "pour l'atmosphère" — l'atmosphère est portée par la couleur et l'espacement, pas par le changement de caractère.

**La Règle Anti-Fluid.** Pas de `clamp()` sur les titres d'interface. La typographie product est fixe en rem. Les titres de pages s'adaptent à leur contexte (sidebar, panneau, modal) par des tailles de classe différentes, pas par fluidité.

## 4. Elevation

Lumosphère est plat par défaut. L'écrasante majorité des surfaces — header, sidebar admin, formulaires, panneaux admin, listes — est délimitée par des bordures (`border border-(--color-border)`) sans aucune ombre.

Deux exceptions délibérées :
- Les **CartesCitation** (`shadow-sm` au repos, `shadow-md` au hover). Ce sont les seuls éléments interactifs-de-contenu dans l'interface ; leur lift au hover signal que la carte est cliquable et oriente le regard sur le corpus, objet central de l'application.
- La **sidebar de filtres du corpus** (branche non-admin, §4bis), traitée comme une **carte flottante** (`rounded-lg border border-(--color-border) bg-(--color-bg-card) shadow-sm`) plutôt qu'une bande de chrome collée au bord. Ombre **statique** (pas de `hover:shadow-md`) — elle se détache du fond de page mais ne simule pas d'interactivité de contenu. La sidebar admin (`AdminNav`) reste plate, sans changement.

### Shadow Vocabulary
- **Ambient-Low** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): État de repos des cartes de citations. Présence subtile, non visible à distance.
- **Ambient-Mid** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)`): État hover des cartes de citations. Élévation perceptible, retour de feedback d'interactivité.

### Named Rules
**La Règle du Chrome Plat.** Tout l'UI chrome (header, sidebar admin, panneaux, modales, formulaires) est rendu plat avec des bordures. Aucune ombre sur les éléments de navigation ou d'administration. Les ombres sont réservées au contenu du corpus et à la sidebar de filtres (traitée comme une carte de contenu, voir ci-dessus) — pas au reste du chrome.

## 4bis. Mise en page

**Coquille centrée.** Le header reste pleine largeur ; en dessous, sidebar + contenu vivent dans un conteneur centré `max-w-screen-2xl mx-auto`, avec un espacement `gap-6` entre la sidebar et le `main` (`flex lg:flex-row`). Sur très grand écran, cette coquille laisse apparaître des marges symétriques plutôt que de remplir le viewport bord à bord — changement de philosophie assumé par rapport à la version précédente (« l'app remplit l'écran », sidebar collée au bord gauche).

**Sidebar (branche corpus, non-admin).** N'est plus une bande collée au bord gauche (bordures + fond `--color-bg-sidebar`) : c'est désormais une **carte flottante** (`rounded-lg border border-(--color-border) bg-(--color-bg-card) shadow-sm`), élargie de `lg:w-80` (320px) à `lg:w-96` (384px). Elle porte un **pied fixe** non défilant (bouton « Réinitialiser » + crédit Lulumineuse), seule la zone des filtres défile en interne. Sous `lg`, sur la vue corpus, elle est masquée par défaut et s'ouvre via le bouton **« Filtres »** placé dans le header (à gauche du menu hamburger), ce qui laisse les citations en premier. L'état ouvert/fermé vit dans le `CorpusSearchProvider` (`filtersOpen` / `toggleFilters`) ; le Header y accède via `useCorpusSearchOptional()` pour rester fonctionnel hors provider (page de connexion). *(La sidebar admin — `AdminNav` — n'a pas changé : elle reste une bande collée au bord, plate, sans carte.)*

**Cartes de citations.** La liste occupe la largeur du `main`, plafonnée à `max-w-[90rem]` (~1440px) et centrée. Le souffle de lecture vient du **padding horizontal de la carte** (`px-7`), qui marge le texte à gauche et à droite. La règle prose « 65–75ch » de la §3 ne s'applique pas au texte pleine largeur des citations : sur desktop, le layout à deux colonnes (§5, Cards) plafonne néanmoins le texte à `lg:max-w-[85ch]` pour préserver un rail de métadonnées.

## 5. Components

### Buttons
Les boutons sont tactiles et rassurants : des retours d'état nets, sans exagération décorative.

- **Shape:** Légèrement arrondi (6px — `rounded-md`). Jamais de bord vif (0px) ni de pilule (full).
- **Primary (Vert Éditorial):** `bg-[#2b4f35] text-white rounded-md px-4 py-2 text-sm`. Hover: transition vers Indigo Marqueur `#4338ca`. Signal fort de changement d'état.
- **Accent (Or Parchemin):** `bg-[#d3b67b] text-white rounded-md px-3 py-2 text-sm`. Utilisé pour les actions secondaires dans les panneaux de configuration (Enregistrer les droits).
- **Ghost (transparent):** `text-(--color-text-primary) hover:bg-(--color-bg-button) rounded-md px-3 py-2 text-sm`. Fond très légèrement rosé (`#fff4f4`) au hover — discret, lisible.
- **Danger (texte seul):** `text-(--color-danger-text)` sans fond. Jamais de bouton rouge solide dans l'interface — la destruction s'annonce dans la typographie, pas dans la couleur de fond.
- **Transition:** `transition-colors` 150ms. Pas d'animation de transform.

### Tags / Chips

Deux familles distinctes :
- **Tags de filtrage** (sidebar, CorpusFilters): `bg-(--color-tag-bg) text-(--color-tag-text) rounded-full px-2 py-0.5 text-xs` — fond mauve givré (`#ececff`), texte indigo. Sémantiquement liés aux filtres actifs.
- **Mots-clés de citations** (CitationCard): `bg-(--color-bg-sidebar) text-(--color-text-secondary) rounded-full px-2 py-1 text-xs` — fond givre pâle, texte gris. Neutres, informatifs.

Ne jamais mélanger les deux familles sur le même écran sans distinction visuelle claire.

### Filtres (CorpusFilters) et barre de résultats (ResultsInfoBar)
- **Titres de section** (Œuvres, Thèmes, Mots-clés, Période) : `<h2>` en casse normale, `text-sm font-semibold text-(--color-text-secondary)` — remplace l'ancien `<h3>` en petites capitales (`uppercase text-xs`). Registre plus proche du corps de texte, cohérent avec une sidebar devenue carte de contenu (§4bis) plutôt que panneau de navigation dense.
- **Tri « Afficher par : Date / Pertinence »** : déplacé de `CorpusFilters` vers `ResultsInfoBar`, à droite du compteur de résultats — et désormais **toujours visible**, plus seulement pendant une recherche active (le bouton « Pertinence » reste `disabled` tant que la requête est vide). Le compteur de résultats ne se déplace jamais.
- **Zone de statut** (à gauche de `ResultsInfoBar`) : réservée à un futur système de messages (« Traitement/Export en cours… »), pas encore câblée (`statusMessage = null`, placeholder assumé). Elle détermine si un cadre (`border` + `bg-(--color-bg-card)`) apparaît autour de la barre — pas de cadre tant qu'aucun message n'est présent.

### Cards (CitationCard)
La carte de citation est le composant le plus identitaire de l'application. Depuis la refonte de l'accueil, elle suit un layout responsive à deux variantes distinctes (« Variante B »).

- **Corner Style:** Légèrement plus arrondi que les boutons — 8px (`rounded-lg`) pour une douceur qui invite à la lecture.
- **Background:** Blanc pur (`#ffffff`) sur fond Blanc Végétal (`#f8fefc`) — contraste faible mais perceptible.
- **Shadow Strategy:** Ambient-Low au repos (`shadow-sm`), Ambient-Mid au hover (`shadow-md`) — le seul composant avec élévation *dynamique* (la sidebar-carte du §4 porte une ombre statique, sans hover).
- **Border:** `border border-(--color-border)` (`#e2e8f0`) — contour fin.
- **Internal Padding:** `px-7 py-5` — généreux horizontalement pour la lisibilité du contenu Markdown.
- **Accessibilité :** chaque carte (`<article>`) porte `aria-label="{Œuvre} — {Thème}"`, pour un repérage net au lecteur d'écran dans une liste dense.

**Bureau (`lg:` et plus) — 2 colonnes.** `lg:flex lg:gap-6` : à gauche, le texte de la citation (thème en petit label + contenu Markdown, plafonné à `lg:max-w-[85ch]`) ; à droite, un **rail** (`lg:w-52`, séparé par `lg:border-l lg:border-(--color-border)` — une bordure neutre, jamais un filet coloré, cf. Don't §6) qui regroupe le nom de l'œuvre (Or Encre, `font-medium`), les mots-clés et les actions (favori/éditer).

**Mobile — inchangé.** Disposition empilée : thème en haut à gauche, œuvre en haut à droite (même ligne), texte pleine largeur sans colonne latérale, mots-clés + actions en pied de carte (`border-t`). Les deux jeux d'actions (rail bureau, pied mobile) coexistent dans le DOM et basculent via `lg:hidden` / `hidden lg:flex` — à garder en tête pour les sélecteurs de test (`getAllBy...` plutôt que `getBy...`).

### Inputs / Fields
- **Style:** Fond blanc pur, `border border-(--color-border)`, `rounded-md`, padding `px-3 py-2`.
- **Focus:** `ring-2 ring-(--color-action)` ou `focus-visible:outline` — signal vert éditorial cohérent avec les boutons primaires.
- **Error:** `border-(--color-danger)` + message `text-xs text-(--color-danger-text)` sous le champ.
- **Disabled:** `opacity-50 cursor-not-allowed`.

### Navigation (Header)
- Header sticky `z-50`, fond blanc, `border-b border-(--color-border-header)`, `px-4 py-3`. **Sans ombre en mode clair** (`border-b` seul) — conforme à la Règle du Chrome Plat (§4).
- Logo: icône `SunHorizon` en Or Parchemin + texte `text-lg font-bold text-(--color-text-header)`.
- Liens: `rounded-md px-3 py-2 text-sm text-(--color-link-header) hover:bg-(--color-bg-button)` — ghost transparent, hover rosé discret.
- Lien « Favoris » actif : `text-(--color-accent-ink)` (Or Encre) au lieu de l'accent brut — cohérent avec la règle « jamais l'or comme couleur de texte » du §2.
- Mobile: menu hamburger en `Phosphor/List` + `Phosphor/X`.

### Navigation (AdminNav — Sidebar admin)
- NavLinks avec état actif via `useLocation`.
- Inactif: `text-(--color-text-secondary) hover:bg-(--color-bg-button)`.
- Actif: `bg-(--color-accent-bg) text-(--color-text-primary) font-medium` — fond crème jaune (`#ffffdf`), signal distinct de l'état courant.

### Signature Component: Permission Group Header (admin)
En-têtes de groupes de permissions dans l'écran Rôles et droits : `text-xs font-semibold uppercase tracking-widest text-(--color-text-placeholder)` + règle `border-t border-(--color-border)`. Traitement éditorial — séparateurs de chapitres dans une grille de configuration. L'identité littéraire du projet se manifeste dans l'administration, pas seulement dans le corpus.

## 6. Do's and Don'ts

### Do:
- **Do** utiliser l'Or Parchemin (`#d3b67b`) exclusivement pour les éléments qui méritent d'être remarqués : titres d'œuvres, sélections actives, icône de logo.
- **Do** conserver `transition-colors 150ms` sur tous les éléments interactifs. Le feedback immédiat est la fondation du "tactile et rassurant".
- **Do** vérifier les contrastes texte/fond à chaque nouveau composant : ≥ 4,5:1 pour le texte courant (`--color-text-secondary` sur `--color-bg-card` = #706b63 sur #ffffff = 5,0:1 ✓).
- **Do** utiliser `shadow-sm → shadow-md` au hover sur les CitationCards uniquement. L'élévation dynamique appartient au contenu, pas à l'UI chrome.
- **Do** utiliser les en-têtes de groupes en `uppercase tracking-widest text-xs` dans l'admin pour structurer les panneaux denses. C'est la signature typographique de la zone d'administration.
- **Do** respecter les deux familles de tags : mauve (`--color-tag-bg`) pour les filtres actifs, givre (`--color-bg-sidebar`) pour les mots-clés de corpus.
- **Do** utiliser `text-wrap: balance` sur les `<h1>` et `<h2>` pour éviter les veuves.
- **Do** privilégier l'air et l'espacement généreux sur la surface lecteur (accueil/bibliothèque) plutôt que la densité : c'est une lecture contemplative de citations spirituelles, pas un tableau de bord à parcourir vite.

### Don't:
- **Don't** introduire de fond crème, sable, parchemin ou ivoire (`oklch L 0.84-0.97, C < 0.06, hue 40-100`). Le fond de page est Blanc Végétal (`#f8fefc`) — légèrement teinté de vert froid, pas de brun chaud. C'est délibéré et distinctif.
- **Don't** utiliser de SaaS blanc aseptisé (Notion/Linear-like), ni de violet/bleu startup (`#6366f1`, `#8b5cf6`) comme couleur primaire en mode clair. Ce sont les anti-références explicites du projet.
- **Don't** ajouter d'ombres sur le header, la sidebar, les panneaux admin ou les formulaires. L'UI chrome est plate, point.
- **Don't** utiliser `border-left: 3px solid var(--color-accent)` comme accent décoratif sur des cartes ou des listes. Rewrite avec un fond teinté ou une règle horizontale.
- **Don't** utiliser de gradient text (`background-clip: text`). Jamais. L'emphase passe par le poids (`font-semibold`) ou la couleur solide (Or Parchemin).
- **Don't** afficher de gris institutionnel pur (`#888888`, `#999999`) dans les textes. Tous les neutres de texte tirent vers le brun chaud ou l'ardoise.
- **Don't** utiliser les polices en mode display (titres >24px) dans les boutons, labels ou cellules de tableaux. Inter ne monte pas au-delà de `text-2xl` dans l'interface.
- **Don't** utiliser `modal` comme première réponse à un formulaire complexe. Épuiser les alternatives inline avant d'ouvrir une Dialog.
- **Don't** créer de grilles de cartes identiques (même hauteur, même icône, même structure répétée). Les cartes de citations varient naturellement ; si une nouvelle grille devient uniforme, revoir l'architecture du composant.
- **Don't** ignorer le mode sombre lors de l'ajout de couleurs codées en dur. Utiliser uniquement les tokens CSS (`var(--color-*)`) — jamais de hex directs dans les classes Tailwind pour les couleurs sémantiques.
- **Don't** utiliser d'esthétique religieuse/associative datée : couleurs criardes, mise en page chargée, iconographie clichée (colombes, mandalas, halos, dégradés ciel). Anti-référence explicite du projet (PRODUCT.md).
