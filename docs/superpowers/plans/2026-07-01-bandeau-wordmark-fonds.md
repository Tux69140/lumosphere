# Bandeau — wordmarks de marque + fond adapté — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher le wordmark de marque Lumosphère (clair/sombre) dans la barre de menu supérieure, avec un fond de bandeau recalé sur la couleur de fond des wordmarks.

**Architecture:** Deux images PNG rognées (sous-titre retiré) importées dans `Header.tsx` ; bascule clair/sombre via le variant Tailwind `dark:` (aucun JS ajouté, on réutilise la classe `.dark` déjà gérée par `useTheme`). Seule la variable de fond du bandeau change dans `index.css` ; le reste de la charte §28 est intact.

**Tech Stack:** React 19 + Vite + TypeScript + Tailwind CSS v4 (variables CSS), Vitest + Testing Library, ImageMagick (`convert`) pour la découpe des assets.

## Global Constraints

- Palette **charte §28 validée par l'autrice** inchangée, sauf `--color-bg-header` (clair + sombre).
- Fond de bandeau cible : clair `#FDF7F1`, sombre `#14281E` (prélevés sur les fichiers fournis).
- Assets wordmark **remplaçables sans toucher au code** : chemins/noms stables dans `src/assets/`.
- Labels UI en **français accentué** ; identifiants techniques en anglais.
- Branche dédiée `bandeau-wordmark-fonds` ; **pas de push ni de PR sans demande explicite** du chef de projet.
- Gate qualité avant « terminé » : `pnpm lint`, `pnpm build`, `pnpm tsc --noEmit`, `pnpm test` verts ; `gitleaks detect -v` (via hook pre-commit).
- Badges de mots-clés (`CitationCard.tsx`) : **ne pas y toucher** (hors périmètre).

---

## File Structure

- **Create** `src/assets/lumosphere-wordmark-clair.png` — wordmark rogné, fond crème `#FDF7F1`.
- **Create** `src/assets/lumosphere-wordmark-sombre.png` — wordmark rogné, fond vert `#14281E`.
- **Create** `src/assets/README.md` — contrat de remplacement des assets.
- **Modify** `src/index.css` — `--color-bg-header` dans `:root` et `.dark`.
- **Modify** `src/components/Header.tsx` — remplacement du bloc marque (icône + texte) par les deux `<img>`.
- **Modify** `src/components/__tests__/Header.test.tsx` — ajout d'une assertion sur le lien de marque.
- **Modify** `docs/charte_couleurs-lumosphere.md` + `docs/cahier_des_charges-lumosphere.md` (§28) — synchro des 2 valeurs de fond de bandeau.

---

## Task 1: Assets wordmark (découpe + contrat de remplacement)

**Files:**
- Create: `src/assets/lumosphere-wordmark-clair.png`
- Create: `src/assets/lumosphere-wordmark-sombre.png`
- Create: `src/assets/README.md`

**Interfaces:**
- Consumes: fichiers sources `docs/UI/Nom-clair.png`, `docs/UI/Nom-sombre.png` (1536×395).
- Produces: deux PNG `1536×300` (ratio 5.12:1), cadrés à l'identique, importables par `Header.tsx` (Task 3).

- [ ] **Step 1: Générer les deux assets rognés**

Le rectangle de coupe `1536x300+0+35` retire la bande du sous-titre (y≈358-374) en conservant « LUMOSPHÈRE » + le soleil et ses rayons. Rectangle **identique** pour les deux fichiers (cadrage cohérent au changement de thème).

```bash
mkdir -p src/assets
convert docs/UI/Nom-clair.png  -crop 1536x300+0+35 +repage src/assets/lumosphere-wordmark-clair.png
convert docs/UI/Nom-sombre.png -crop 1536x300+0+35 +repage src/assets/lumosphere-wordmark-sombre.png
```

- [ ] **Step 2: Vérifier les dimensions**

Run: `identify -format "%f %wx%h\n" src/assets/lumosphere-wordmark-*.png`
Expected :
```
lumosphere-wordmark-clair.png 1536x300
lumosphere-wordmark-sombre.png 1536x300
```

- [ ] **Step 3: Vérification visuelle (le « test » d'un asset image)**

Ouvrir les deux PNG (outil Read ou visionneuse). Confirmer : (a) **plus de sous-titre**, (b) le mot **LUMOSPHÈRE entier** est présent, (c) le **soleil et ses rayons** sont là, (d) fond uniforme (crème / vert). Si un rayon est visiblement tronqué de façon gênante, c'est acceptable en v1 (l'autrice régénérera une version serrée) — ne pas bloquer.

- [ ] **Step 4: Écrire le contrat de remplacement**

Create `src/assets/README.md` :

```markdown
# Assets de marque — bandeau

Wordmarks « Lumosphère » affichés dans la barre de menu supérieure (`src/components/Header.tsx`).

| Fichier | Thème | Fond attendu | Dimensions de référence |
|---|---|---|---|
| `lumosphere-wordmark-clair.png` | clair | crème `#FDF7F1` | 1536×300 (ratio ~5:1) |
| `lumosphere-wordmark-sombre.png` | sombre | vert `#14281E` | 1536×300 (ratio ~5:1) |

## Remplacer les images (aucune modif de code)

Déposer la nouvelle version **au même chemin, même nom**. Contraintes :
- Fond de l'image = fond du bandeau (`--color-bg-header` dans `src/index.css`) pour un fondu sans bord visible : crème `#FDF7F1` (clair), vert `#14281E` (sombre).
- Garder un ratio large proche de 5:1 et un cadrage identique entre les deux versions (le bandeau les affiche à hauteur fixe `h-9`).
- Sans sous-titre (illisible à cette taille).

Version rognée initiale produite depuis `docs/UI/Nom-clair.png` / `Nom-sombre.png` via :
`convert <source> -crop 1536x300+0+35 +repage <cible>`
```

- [ ] **Step 5: Commit**

```bash
git add src/assets/lumosphere-wordmark-clair.png src/assets/lumosphere-wordmark-sombre.png src/assets/README.md
git commit -m "feat(brand): assets wordmark rognés (clair/sombre) + contrat de remplacement"
```

---

## Task 2: Fond du bandeau (`index.css`)

**Files:**
- Modify: `src/index.css` (`:root` ~l.43, `.dark` ~l.79)

**Interfaces:**
- Consumes: rien.
- Produces: `--color-bg-header` = `#FDF7F1` (clair) / `#14281E` (sombre), consommé par la classe `bg-(--color-bg-header)` déjà présente sur `<header>`.

- [ ] **Step 1: Modifier le mode clair**

Dans `:root`, remplacer :
```css
  --color-bg-header: #ffffff;
```
par :
```css
  --color-bg-header: #fdf7f1; /* crème du wordmark de marque (fondu du bandeau) */
```

- [ ] **Step 2: Modifier le mode sombre**

Dans `.dark`, remplacer :
```css
  --color-bg-header: #1e293b;
```
par :
```css
  --color-bg-header: #14281e; /* vert profond du wordmark de marque (fondu du bandeau) */
```

- [ ] **Step 3: Vérifier le build**

Run: `pnpm build`
Expected: build Vite en succès, aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style(header): fond du bandeau recalé sur les wordmarks (crème/vert)"
```

---

## Task 3: Wordmark dans le bandeau (`Header.tsx`)

**Files:**
- Modify: `src/components/Header.tsx` (imports en tête ; bloc marque ~l.117-120 ; import `SunHorizon` ~l.5)
- Test: `src/components/__tests__/Header.test.tsx`

**Interfaces:**
- Consumes: `src/assets/lumosphere-wordmark-clair.png`, `src/assets/lumosphere-wordmark-sombre.png` (Task 1) ; classe `.dark` gérée par `useTheme` (existant).
- Produces: un lien de marque vers `/` dont le nom accessible est « Lumosphère — accueil ».

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `src/components/__tests__/Header.test.tsx`, à l'intérieur du `describe('Header', ...)` :

```tsx
  it('affiche le lien de marque Lumosphère vers l’accueil', () => {
    renderHeader(null)
    const brand = screen.getByRole('link', { name: /lumosphère/i })
    expect(brand).toHaveAttribute('href', '/')
  })
```

- [ ] **Step 2: Lancer le test — il échoue**

Run: `pnpm test -- Header`
Expected: FAIL — aucun lien de nom accessible « Lumosphère » (la marque est aujourd'hui une icône + `<span>` non liés par un nom accessible de lien).

- [ ] **Step 3: Importer les assets et retirer `SunHorizon`**

En tête de `src/components/Header.tsx` :
- Retirer `SunHorizon,` de l'import `@phosphor-icons/react` (plus utilisé après cette task).
- Ajouter, après les imports de hooks/constantes :

```tsx
import wordmarkClair from '@/assets/lumosphere-wordmark-clair.png'
import wordmarkSombre from '@/assets/lumosphere-wordmark-sombre.png'
```

- [ ] **Step 4: Remplacer le bloc marque**

Remplacer :
```tsx
        <Link to="/" className="flex items-center gap-2 no-underline">
          <SunHorizon size={28} weight="fill" className="text-(--color-accent)" />
          <span className="text-lg font-bold text-(--color-text-header)">Lumosphère</span>
        </Link>
```
par :
```tsx
        <Link
          to="/"
          aria-label="Lumosphère — accueil"
          className="flex items-center no-underline"
        >
          <img
            src={wordmarkClair}
            alt=""
            aria-hidden="true"
            className="h-9 w-auto dark:hidden"
          />
          <img
            src={wordmarkSombre}
            alt=""
            aria-hidden="true"
            className="hidden h-9 w-auto dark:block"
          />
        </Link>
```

Note : les deux images sont décoratives (`alt=""` + `aria-hidden`), le nom accessible vient de l'`aria-label` du lien — identique en clair et en sombre.

- [ ] **Step 5: Lancer le test — il passe**

Run: `pnpm test -- Header`
Expected: PASS (y compris les 4 tests existants, inchangés).

- [ ] **Step 6: Gate qualité**

Run: `pnpm lint && pnpm tsc --noEmit && pnpm build`
Expected: tout vert. En particulier, aucune erreur « SunHorizon is defined but never used » (import bien retiré).

- [ ] **Step 7: Commit**

```bash
git add src/components/Header.tsx src/components/__tests__/Header.test.tsx
git commit -m "feat(header): wordmark de marque clair/sombre à la place de l'icône + texte"
```

---

## Task 4: Synchroniser la documentation (charte)

**Files:**
- Modify: `docs/charte_couleurs-lumosphere.md`
- Modify: `docs/cahier_des_charges-lumosphere.md` (§28)

**Interfaces:**
- Consumes: valeurs figées en Task 2.
- Produces: docs de charte cohérents avec le code (« source de vérité unique »).

- [ ] **Step 1: `charte_couleurs-lumosphere.md` — mode clair**

Remplacer la ligne :
```
| Fond de la barre de menu supérieure | `#ffffff` |
```
par :
```
| Fond de la barre de menu supérieure | `#FDF7F1` |
```

- [ ] **Step 2: `charte_couleurs-lumosphere.md` — mode sombre**

Remplacer la ligne :
```
| Fond de la barre de menu supérieure | `#1e293b` |
```
par :
```
| Fond de la barre de menu supérieure | `#14281E` |
```

- [ ] **Step 3: Ajouter une note de contexte sous le titre**

Sous la ligne `> Palette validée. Source de vérité pour les couleurs de l'application.`, ajouter :
```markdown
>
> **Note (2026-07-01)** — Le *fond de la barre de menu supérieure* a été adapté (clair `#FDF7F1`, sombre `#14281E`) pour se fondre avec les wordmarks de marque (`src/assets/lumosphere-wordmark-*.png`). Le reste de la palette est inchangé.
```

- [ ] **Step 4: `cahier_des_charges-lumosphere.md` §28 — mode clair**

Remplacer la ligne :
```
Fond de la barre de menu supérieure: #ffffff
```
par :
```
Fond de la barre de menu supérieure: #FDF7F1
```

- [ ] **Step 5: `cahier_des_charges-lumosphere.md` §28 — mode sombre**

Dans le bloc `[Mode sombre]` de la §28, remplacer la ligne :
```
Fond de la barre de menu supérieure: #1e293b
```
par :
```
Fond de la barre de menu supérieure: #14281E
```

- [ ] **Step 6: Commit**

```bash
git add docs/charte_couleurs-lumosphere.md docs/cahier_des_charges-lumosphere.md
git commit -m "docs(charte): fond de bandeau adapté aux wordmarks (clair #FDF7F1 / sombre #14281E)"
```

---

## Task 5: Vérification visuelle finale (capture clair + sombre)

**Files:** aucun (validation).

**Interfaces:**
- Consumes: app buildée (Tasks 1-3).
- Produces: 2 captures du bandeau pour validation par le chef de projet.

- [ ] **Step 1: Lancer le serveur de dev**

Run (arrière-plan) : `pnpm dev`
Expected: Vite sert l'app (URL locale, p. ex. `http://localhost:5173`). Le backend PHP :8080 est absent — sans importance : le bandeau s'affiche indépendamment de l'API.

- [ ] **Step 2: Capturer le bandeau en clair puis en sombre**

Via Playwright (Chromium intégré) : ouvrir la page d'accueil, capturer le haut de la page. Basculer le thème avec le bouton du bandeau (icône lune/soleil), recapturer. Objectif : vérifier le **fondu sans bord visible** entre l'image et le bandeau, et la lisibilité.

- [ ] **Step 3: Contrôles**

- Clair : wordmark net sur fond crème, aucun rectangle/bord visible autour de l'image.
- Sombre : wordmark net sur fond vert, aucun bord visible.
- Bordure basse du bandeau toujours présente (séparation avec le contenu).
- Fournir les 2 captures au chef de projet **avant de considérer la v1 figée**.

---

## Self-Review

**Couverture de la spec :**
- Assets wordmark rognés + remplaçables → Task 1. ✅
- Fond du bandeau clair/sombre → Task 2. ✅
- Wordmark clair/sombre en pur CSS (variant `dark:`) → Task 3. ✅
- Palette §28 inchangée hors fond bandeau → Tasks limitées à `--color-bg-header` + `Header.tsx`. ✅
- Badges mots-clés laissés en l'état → non touchés (contrainte globale). ✅
- Synchro §28 + charte_couleurs → Task 4. ✅
- Vérif contraste + capture → Task 5 (+ contrastes attendus largement AA, cf. spec). ✅

**Placeholders :** aucun ; commandes et code complets.

**Cohérence des types/noms :** noms d'assets identiques entre Task 1 (création), README (Task 1) et imports Task 3 (`lumosphere-wordmark-clair.png` / `-sombre.png`). Classe `bg-(--color-bg-header)` déjà sur `<header>` — pas de nouveau nom introduit.
