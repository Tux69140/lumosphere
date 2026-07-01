# Bandeau — wordmarks de marque + fond adapté — Design

**Date :** 2026-07-01
**Statut :** Spec validée (conception), implémentation à planifier
**Périmètre :** `src/components/Header.tsx` + variables de fond du bandeau dans `src/index.css` + assets wordmark. Aucune autre page touchée (v1 « pour voir »).

## Objectif

Intégrer l'identité de marque **Lumosphère** dans la barre de menu supérieure :

- afficher le **wordmark** de marque (mot + soleil) fourni par l'autrice, à la place de l'icône soleil + texte « Lumosphère » actuels ;
- **recaler le fond du bandeau** sur la couleur de fond des wordmarks, pour que l'image se fonde dans la barre sans rectangle visible ;
- bascule automatique **clair / sombre** selon le thème.

## Contexte existant (source de vérité)

- Charte couleurs **validée par l'autrice** : cahier des charges §28 + `docs/charte_couleurs-lumosphere.md` (marqué « source de vérité »). Cette palette **reste inchangée**, sauf les 2 valeurs de fond de bandeau adaptées ici.
- Bandeau actuel `src/components/Header.tsx` : marque rendue par `<SunHorizon>` (Phosphor) + `<span>Lumosphère</span>` (lignes ~117-120).
- Fonds de bandeau actuels dans `src/index.css` :
  - `--color-bg-header` : `#ffffff` (clair) / `#1e293b` (sombre) ;
  - texte/bordures du bandeau : `--color-text-header`, `--color-border-header`, etc. (inchangés).
- Thème : variant Tailwind `dark` piloté par la classe `.dark` (cf. `@custom-variant dark` dans `index.css`) — permet une bascule d'image **en pur CSS**, sans JS.
- Fichiers fournis par l'autrice : `docs/UI/Nom-clair.png` (1536×395, fond crème) et `docs/UI/Nom-sombre.png` (1536×395, fond vert profond). **Les deux incluent un sous-titre** « L'INDEX INTERACTIF EN LIGNE DE TOUTES LES RESSOURCES » sous le mot.

## Couleurs de référence (prélevées sur les fichiers fournis)

| Élément | Clair | Sombre |
|---|---|---|
| Fond du wordmark (coins de l'image) | `#FDF7F1` | `#14281E` |

Ces deux valeurs deviennent le **fond du bandeau** correspondant.

## Décisions validées

1. **Ampleur** : la charte §28 reste la référence. On **n'adapte que les fonds**, et en v1 **uniquement le fond du bandeau** (« bandeau seul dans un premier temps, pour voir »). Fond de page, cartes, sidebar, champs : inchangés.
2. **Wordmark rogné** : on retire le sous-titre (illisible dans un bandeau de 64 px) tout en gardant les rayons du soleil. L'autrice pourra **régénérer** une version plus serrée ; l'asset doit donc être **remplaçable sans toucher au code**.
3. **Recréation en texte écartée** : on utilise bien les PNG fournis (pas de reconstruction en police/SVG).
4. **Badges de mots-clés** : laissés **en l'état** (gris). Hors périmètre, malgré l'écart connu avec la §28. Voir « Écart connu, non traité ».
5. **Git** : travail sur branche dédiée `bandeau-wordmark-fonds`, jamais directement sur `main`.

## Conception

### A. Assets wordmark

- Rogner `docs/UI/Nom-clair.png` et `docs/UI/Nom-sombre.png` pour **supprimer la bande du sous-titre** (bas de l'image) en **conservant toute la hauteur du halo/rayons du soleil**.
- Déposer les résultats dans `src/assets/` sous des noms stables, p. ex. :
  - `src/assets/lumosphere-wordmark-clair.png`
  - `src/assets/lumosphere-wordmark-sombre.png`
- **Contrat de remplacement** : l'autrice dépose sa version régénérée **au même chemin, même nom** → aucune modification de code nécessaire. À documenter dans un court `src/assets/README.md` (dimensions cible, fond attendu = fond de bandeau).

### B. Bandeau (`Header.tsx`)

- Remplacer le bloc marque (icône `SunHorizon` + `<span>Lumosphère</span>`) par **deux `<img>`** : version claire visible en thème clair, version sombre visible en thème sombre, via classes Tailwind (`dark:hidden` / `hidden dark:block`). Pas de JS de thème.
- `alt="Lumosphère"` sur les deux (accessibilité) ; l'une des deux peut porter `aria-hidden` pour éviter la double annonce lecteur d'écran.
- Le lien englobant vers `/` est **conservé**.
- Hauteur d'image ~36-40 px (bandeau `h-16` = 64 px), largeur automatique. Le `SunHorizon` n'est plus importé si inutilisé ailleurs (à vérifier).

### C. Fond du bandeau (`index.css`)

- `:root` → `--color-bg-header: #FDF7F1;` (au lieu de `#ffffff`).
- `.dark` → `--color-bg-header: #14281E;` (au lieu de `#1e293b`).
- **Rien d'autre ne change** : texte, liens, icônes et bordure du bandeau conservent leurs valeurs §28.

## Vérification

- **Contraste WCAG AA** à confirmer sur les nouveaux fonds :
  - clair : texte bandeau `#38444D` sur crème `#FDF7F1` (attendu : largement AA) ;
  - sombre : texte bandeau `#f8fafc` sur vert `#14281E` (attendu : largement AA).
- **Fondu** : vérifier qu'aucun rectangle/bord de l'image n'apparaît (fond image = fond bandeau).
- **Capture clair + sombre** fournie au chef de projet avant de figer.
- Tests existants du bandeau : `src/components/__tests__/Header.test.tsx` doit rester vert (adapter si l'assertion portait sur le texte « Lumosphère » — remplacer par l'`alt` de l'image).
- `pnpm lint` + `pnpm build` + `pnpm tsc --noEmit` OK.

## Documentation à synchroniser

- Cahier des charges **§28** : consigner les 2 nouvelles valeurs de fond de bandeau + mention « adapté aux wordmarks de marque (clair `#FDF7F1` / sombre `#14281E`) ».
- `docs/charte_couleurs-lumosphere.md` : idem sur les lignes « Fond de la barre de menu supérieure ».

## Écart connu, non traité (v1)

Les puces de **mots-clés** sur les cartes de citation (`CitationCard.tsx` l.73) sont **grises** (`--color-bg-sidebar`), alors que la §28 prévoit un fond indigo `#ececff` / texte `#4338ca` pour les « tags/puces ». Décision : **laisser en l'état** pour l'instant. À rouvrir lors d'une passe conformité ultérieure si l'autrice le souhaite.

## Hors périmètre

- Réalignement de la palette sur le vert/sauge/cuivre de `docs/UI/epuriel-charte_*.png` (identité « EPURIEL », distincte de la §28 validée).
- Typographie Cinzel/Fraunces des titres.
- Fond de page / cartes / sidebar / champs.
- Correction des badges de mots-clés.
