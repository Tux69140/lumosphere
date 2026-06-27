# T08 — Squelette React : design

> Spec validée par brainstorming. Source : devbook développement §I.7 + complément I.7.

## Objectif

Poser la coquille de l'application web Lumosphère : layout, routage, thème clair/sombre, charte graphique, couche services, et premières données réelles dans le corpus. Après T08, l'app affiche de vraies citations dans un squelette navigable.

---

## 1. Routage

**React Router v7** (à installer).

| Route | Page | Contenu T08 |
|-------|------|-------------|
| `/` | Accueil | Layout complet (header + sidebar filtres + zone citations) avec les données du seed |
| `/login` | Connexion | Placeholder (implémenté en T09) |
| `/admin` | Administration | Placeholder (implémenté à partir de T14) |
| `*` | 404 | Message « Page introuvable » avec lien retour accueil |

Onglet navigateur : « Lumosphère » sur toutes les pages (pas de préfixe par sous-page).

---

## 2. Structure des dossiers

Organisation hybride : briques réutilisables séparées du code métier.

```
public/
├── assets/
│   └── img/          ← images statiques (maintenance.jpg, logo futur…)
│                       copiées telles quelles dans dist/ au build
│                       → serveur : public_html/assets/img/
src/
├── components/       ← briques UI partagées (boutons, modales, badges, inputs)
├── features/         ← domaines métier
│   ├── accueil/      ← page principale (citations, sidebar filtres)
│   ├── auth/         ← login (placeholder T08, implémenté T09)
│   └── admin/        ← administration (placeholder T08)
├── layouts/          ← gabarits de page
│   ├── MainLayout.tsx    ← header + sidebar + zone contenu
│   └── AuthLayout.tsx    ← layout simple pour login/setup
├── hooks/            ← hooks globaux (useTheme, useAuth…)
├── lib/              ← utilitaires purs (formatage, helpers)
├── services/         ← api.ts (existe déjà)
├── App.tsx           ← routeur principal
├── main.tsx          ← point d'entrée
└── index.css         ← Tailwind + variables CSS charte
```

---

## 3. Layout

Inspiré de la maquette Index Lulu'mineux (`docs/UI/acceuil.jpg`).

### Header (fixe, collant en haut)

Contenu T08 :
- **Gauche** : logo provisoire (icône Phosphor `SunHorizon` en orange, remplacé plus tard par le vrai logo Epuriel) + « Lumosphère » (cliquable → `/`)
- **Droite** : bascule thème (clair/sombre/auto) + bouton « Connexion » (→ `/login`)

Responsive : le header se transforme en **menu burger** sur mobile (< 768px). Les éléments de droite passent dans un menu déroulant.

Éléments ajoutés plus tard (quand la fonctionnalité existe) :
- Déconnexion (T09)
- Admin (T09, si rôle éditeur/admin)
- Favoris (T17)
- Aide contextuelle (T17)
- Bibliothèque documents (T38)
- Contact (T39)

Pas de nom d'utilisateur affiché — un simple bouton de déconnexion suffit.

### Sidebar gauche (filtres)

- **Desktop** (≥ 1024px) : sidebar fixe à gauche, à côté de la zone de contenu
- **Tablette/mobile** (< 1024px) : la sidebar passe **au-dessus** de la zone de citations (empilée)

Contenu T08 : structure vide avec placeholders (champ recherche désactivé, listes de filtres vides). Les filtres fonctionnels arrivent en T13/T17.

### Zone principale

- **Barre d'information** : compteur d'entrées (ex : « 6 entrées ») + zone de notifications applicatives (messages d'erreur API, confirmation d'actions, etc.)
- Cartes de citations issues du seed (texte, auteur, thème, mots-clés en badges)
- Message « Aucune entrée » si le corpus est vide

---

## 4. Thème clair / sombre / auto

### Mécanisme

- 3 positions : **Clair**, **Sombre**, **Automatique** (suit la préférence système)
- Stocké dans `localStorage` (clé `theme`), valeurs : `light` | `dark` | `auto`
- Défaut : `auto`
- Hook `useTheme()` retourne `{ theme, resolvedTheme, setTheme }`
- La classe `dark` est appliquée sur `<html>` quand le thème résolu est sombre

### Bascule UI

Icône Phosphor dans le header. Clic = cycle entre les 3 positions. L'icône affiche le **mode suivant** (logique bouton d'action) :
- En mode clair → icône `Moon` (« clic pour passer en sombre »)
- En mode sombre → icône `SunMoon` ou `Sun`+`Moon` (« clic pour passer en auto »)
- En mode auto → icône `Sun` (« clic pour passer en clair »)

Toutes les icônes viennent de **Phosphor Icons** (cohérent avec le reste de l'app).

---

## 5. Charte couleurs

Source de vérité : `docs/charte_couleurs-lumosphere.md`.

Implémentation via **CSS custom properties** dans `index.css`, basculées par la classe `dark` sur `<html>`. Les classes Tailwind utilisent ces variables.

Variables principales (extrait) :

| Variable CSS | Clair | Sombre |
|-------------|-------|--------|
| `--color-bg-page` | `#f8fefc` | `#0f172a` |
| `--color-bg-card` | `#ffffff` | `#1e293b` |
| `--color-bg-header` | `#ffffff` | `#1e293b` |
| `--color-text-primary` | `#3D3A35` | `#e2e8f0` |
| `--color-text-secondary` | `#706B63` | `#cbd5e1` |
| `--color-action` | `#2b4f35` | `#818cf8` |
| `--color-action-hover` | `#4338ca` | `#6366f1` |
| `--color-accent` | `#D3B67B` | `#fb923c` |
| `--color-tag-bg` | `#ececff` | `#312e81` |
| `--color-tag-text` | `#4338ca` | `#c7d2fe` |
| `--color-border` | `#e2e8f0` | `#475569` |

L'intégralité des couleurs de la charte est mappée (voir le fichier de référence pour la liste complète).

---

## 6. Seed SQL — données réelles dans le corpus

### Source

6 lots Telegram au statut `exporte` sur le serveur, contenant chacun 1 segment (= 1 citation). Fichiers pivot dans `lots/telegram/*/4_exports/*.pivot.json`.

### Opérations du seed

1. **Créer l'auteur** « Lulumineuse » dans `auteurs`
2. **Créer l'œuvre** associée dans `oeuvres` (liée à l'auteur)
3. **Insérer 6 citations** dans `citations` :
   - `contenu` : texte du segment
   - `oeuvre_id` : FK vers l'œuvre créée
   - `theme_id` : résolu par `SELECT id FROM themes WHERE nom = '...'` (pas d'id en dur)
   - `etat_id` : état « À Corriger » (défaut)
   - `auteur_nom` : « Lulumineuse » (dénormalisé pour FULLTEXT)
   - `telegram_message_id` : `source_message_id` du pivot
   - `date_entree` : `date_publication` du segment
4. **Insérer les mots-clés** dans `keywords` (normalisés, sans doublon) et les lier via `citation_keywords`

### Correspondance thèmes pivot → thèmes en base

| Thème du pivot | ID en base |
|----------------|-----------|
| Vie intérieure et transformation personnelle | 4 |
| Foi et prière | 6 |
| Connaissance et vision du monde | 2 |
| Connaissance de soi | 14 |
| Ouverture à la lumière et à la présence divine | 15 |

Résolution dynamique par nom (pas d'id en dur dans le script).

### Livrable

Script `db/seeds/seed_citations_test.sql` exécutable sur le serveur.

---

## 7. Couche services

`src/services/api.ts` existe déjà avec le client API complet (auth, CSRF, CRUD). Aucune modification nécessaire pour T08.

Pour l'accueil T08, les citations sont chargées via `apiClient.findCitations()`.

---

## 8. Assets statiques

Dossier existant : `public/assets/img/` (contient `maintenance.jpg`, synchronisé sur le serveur).

Les images statiques de l'app (logo futur, etc.) iront dans `public_html/assets/img/`. Vite les copie telles quelles dans `dist/` au build.

---

## 9. Build et déploiement

### Build

```bash
pnpm run build    # tsc --noEmit && vite build → dist/
```

### Déploiement

```bash
rsync -avz --delete dist/ lumosphere:/home2/mist2786/public_html/
```

Le rsync exclut les dossiers déjà présents sur le serveur :

```bash
rsync -avz --delete --exclude='api/' --exclude='config/' dist/ lumosphere:/home2/mist2786/public_html/
```

### .htaccess

Le `.htaccess` actuel gère la maintenance (cookie `lumosphere_dev=ouilulu`). Il sera adapté pour ajouter les règles SPA :

```apache
# Lumosphère — SPA routing
RewriteEngine On

# API → traitement PHP direct
RewriteRule ^api/ - [L]

# Fichiers existants (assets, images…)
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]

# Tout le reste → SPA
RewriteRule ^ /index.html [L]
```

Le mécanisme de maintenance (cookie dev) est conservé en production et intégré avant les règles SPA.

---

## 10. Tests

### Vitest (unitaires)

- `useTheme()` : vérifie les 3 positions (clair/sombre/auto), la persistance `localStorage`, la résolution du thème auto selon la préférence système
- Smoke test existant (`__tests__/smoke.test.tsx`) : adapter au nouveau `App.tsx` avec routeur

### Playwright (e2e)

- **Navigation** : accueil (`/`) → login (`/login`) → admin (`/admin`) → 404 (`/nimportequoi`) → retour accueil
- **Thème** : clic sur la bascule fait cycler les 3 modes, les couleurs changent visuellement
- **Responsive** : header burger visible en mobile (viewport 375px), sidebar empilée au-dessus du contenu
- **Citations** : les 6 citations du seed s'affichent avec auteur, thème et mots-clés

### Quality gate

Tout doit passer avant de considérer T08 terminé :
1. `pnpm lint` ✓
2. `pnpm build` ✓
3. `pnpm test` ✓
4. `pnpm test:e2e` ✓
5. `gitleaks detect -v` ✓

---

## 11. Ce qui n'est PAS dans T08

- Service worker / manifest PWA (T42)
- Login fonctionnel (T09)
- Filtres fonctionnels (T13)
- Droits par rôle (T14)
- Éditeur Markdown (T15/T19)
- Pipeline atelier→corpus automatisé (T24-T26)

---

## 12. Critères de validation

- [ ] `pnpm build` passe sans erreur
- [ ] L'app s'affiche sur le serveur avec le layout (header + sidebar + zone contenu)
- [ ] Le thème clair/sombre/auto fonctionne et persiste au rechargement
- [ ] Les 4 routes fonctionnent (`/`, `/login`, `/admin`, `/nimportequoi` → 404)
- [ ] Les 6 citations du seed s'affichent sur la page d'accueil
- [ ] La charte couleurs est respectée (vérification visuelle)
- [ ] Responsive : header burger + sidebar empilée sur mobile
- [ ] `gitleaks detect -v` ne détecte aucun secret
