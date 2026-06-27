# Spec I.2 — Vérification et installation des composants

> **Phase** : I.2 du devbook de développement
> **But** : vérifier ce qui est présent dans le dépôt, choisir et installer les composants manquants pour démarrer le développement (Phases I à II).
> **Approche retenue** : installation minimale ciblée — uniquement ce qui est nécessaire pour les phases I et II. Les outils des phases ultérieures seront ajoutés au moment voulu.

---

## 1. Pile frontend retenue

| Catégorie                  | Choix                            | Rôle                                                                   |
| -------------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| Framework                  | **React 19 + Vite + TypeScript** | Base de l'application                                                  |
| Style                      | **Tailwind CSS**                 | Mise en forme (charte §28, thème clair/sombre)                         |
| Composants UI              | **Radix UI** (sans shadcn)       | Briques d'interface accessibles (modales, menus, onglets, infobulles…) |
| Recherche avec suggestions | **cmdk**                         | Champ de recherche/commande avec auto-complétion                       |
| Sélecteur de date          | **react-day-picker**             | Choix de dates dans les filtres                                        |
| Notifications              | **Sonner**                       | Messages temporaires (« Enregistré », « Erreur »…)                     |
| Tableaux                   | **TanStack Table**               | Tableaux avancés (tri, filtres, sélection multiple)                    |
| Icônes                     | **Phosphor Icons**               | Jeu d'icônes unique pour toute l'appli                                 |
| Validation                 | **Zod**                          | Vérification des données côté navigateur                               |
| Gestionnaire de paquets    | **pnpm**                         | Installation et gestion des dépendances                                |
| Tests unitaires            | **Vitest**                       | Tests rapides des fonctions/composants                                 |
| Tests parcours             | **Playwright**                   | Tests de bout en bout (simuler un utilisateur)                         |
| Qualité de code            | **ESLint + Prettier**            | Vérification automatique du style et des erreurs                       |

### Principes

- Radix utilisé directement (pas de surcouche shadcn) pour un contrôle total sur le style et le poids.
- Chaque composant stylé avec Tailwind, fidèle à la charte graphique Lumosphère.
- Portabilité assurée : rien n'empêche une future app desktop (Tauri) ou mobile (Android).

### Justification des choix UI

- **Radix UI** plutôt que Headless UI : catalogue plus complet (~30 composants vs ~16), documentation riche. Headless UI manque d'infobulles, notifications, sélecteur de date, tableaux — il aurait fallu empiler 4-5 bibliothèques tierces.
- **Radix UI** plutôt que React Aria : documentation plus accessible, courbe d'apprentissage plus douce, bundle plus léger. React Aria est plus complet mais plus verbeux.
- **cmdk** pour le combobox : construit par-dessus Radix, intégration native.
- **react-day-picker** pour les dates : léger, bien documenté, compatible Tailwind.
- **Sonner** pour les notifications toast : léger, Tailwind-friendly.
- **Vitest + Playwright** pour les tests : Vitest est natif à Vite (zéro config), Playwright teste tous les navigateurs et est entièrement gratuit.

---

## 2. Outillage PHP

| Outil        | Rôle                                                         | État          |
| ------------ | ------------------------------------------------------------ | ------------- |
| **PHPUnit**  | Tests automatisés du code PHP                                | Déjà installé |
| **PHPStan**  | Analyse statique (détecte les erreurs sans exécuter le code) | À installer   |
| **PHPCS**    | Vérifie la cohérence du style de code PHP                    | À installer   |
| **Gitleaks** | Détecte les secrets avant chaque commit                      | Déjà installé |

PHPStan et PHPCS seront ajoutés au `composer.json` en dépendances de développement.

---

## 3. Éléments reportés

| Élément                        | Raison du report                                                                       | Phase |
| ------------------------------ | -------------------------------------------------------------------------------------- | ----- |
| Éditeur Markdown visuel        | Remplace le champ texte brut d'Epuriel. Évaluation comparative + prototype nécessaires | I.5   |
| yt-dlp, youtube-transcript-api | Chaîne YouTube uniquement                                                              | IV    |
| Ruff (vérificateur Python)     | Workers Python uniquement                                                              | IV    |
| Tesseract, OCRmyPDF, Poppler   | PDF scannés, dépend des capacités o2switch                                             | IV    |
| Pandoc                         | Conversion EPUB                                                                        | VI    |

---

## 4. Ordre d'installation

### Temps 1 — Frontend

1. Initialiser le projet avec Vite (template React + TypeScript).
2. Installer en un bloc : Tailwind CSS, Radix UI, cmdk, react-day-picker, Sonner, TanStack Table, Phosphor Icons, Zod.
3. Installer en un bloc les outils de développement : ESLint, Prettier, Vitest, Playwright.
4. Configurer : Tailwind (charte graphique + thème clair/sombre), ESLint/Prettier, Vitest, TypeScript.

### Temps 2 — Outillage PHP

Ajouter PHPStan et PHPCS au `composer.json` existant en une seule commande Composer.

---

## 5. Structure du dépôt après installation

```
lumosphere/
├── src/               ← code React (nouveau)
├── public/            ← HTML + assets (existant, enrichi)
├── api/               ← PHP API (existant, inchangé)
├── db/                ← migrations (existant, inchangé)
├── docs/              ← documentation (existant)
├── package.json       ← dépendances front (nouveau)
├── vite.config.ts     ← config Vite (nouveau)
├── tailwind.config.ts ← config Tailwind (nouveau)
├── tsconfig.json      ← config TypeScript (nouveau)
├── composer.json      ← dépendances PHP (existant, enrichi)
└── ...
```

Le build Vite (`pnpm build`) produit les fichiers dans `dist/`, envoyés sur le serveur via `rsync`.

---

## 6. Livrable

La « note composants présents / à installer » demandée par le devbook I.2 est rédigée dans un document séparé : `docs/note_composants-I2.md`. Elle contient l'inventaire factuel (ce qui est installé localement et sur le serveur, avec les versions).
