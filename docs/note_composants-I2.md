# Note composants — Phase I.2

> **Date** : 2026-06-23
> **Objet** : inventaire des composants présents et à installer (livrable I.2 du devbook de développement).

---

## Présent dans le dépôt (local)

| Élément             | Version | Emplacement                            |
| ------------------- | ------- | -------------------------------------- |
| PHP                 | 8.4.21  | Système local                          |
| PHPUnit             | 13.2+   | `composer.json` (devDependencies)      |
| PHPStan             | 2.2.2   | `composer.json` (devDependencies)      |
| PHPCS               | 4.0.1   | `composer.json` (devDependencies)      |
| Gitleaks            | 8.22.1  | Installé globalement                   |
| DAL PHP             | —       | `api/dal/` (11 fichiers)               |
| DAL Auth            | —       | `api/dal/auth.php`                     |
| Migrations DB       | —       | `db/migrations/` (5 scripts : 003–007) |
| Migration 008       | —       | `db/migrations/008_login_attempts.sql` |
| Point d'entrée API  | —       | `api/bootstrap.php` + `api/router.php` |
| Endpoints API       | —       | `api/endpoints/` (11 fichiers)         |
| Services front      | —       | `src/services/api.ts`                  |
| Tests DAL           | —       | `tests/dal/` (PHPUnit)                 |
| Page de maintenance | —       | `public/maintenance.html`              |
| React               | 19.2.7  | `package.json` (dependencies)          |
| Vite                | 8.1.0   | `package.json` (devDependencies)       |
| TypeScript          | 5.8.3   | `package.json` (devDependencies)       |
| Tailwind CSS        | 4.3.1   | `package.json` (dependencies)          |
| Radix UI            | *       | `package.json` (dependencies)          |
| cmdk                | 1.1.1   | `package.json` (dependencies)          |
| react-day-picker    | 10.0.1  | `package.json` (dependencies)          |
| Sonner              | 2.0.7   | `package.json` (dependencies)          |
| TanStack Table      | 8.21.3  | `package.json` (dependencies)          |
| Phosphor Icons      | 2.1.10  | `package.json` (dependencies)          |
| Zod                 | 4.4.3   | `package.json` (dependencies)          |
| pnpm                | 9.17.0+ | Système global                        |
| ESLint              | 10.0.1  | `package.json` (devDependencies)       |
| Prettier            | 3.8.4   | `package.json` (devDependencies)       |
| Vitest              | 4.1.9   | `package.json` (devDependencies)       |
| Playwright          | 1.61.0  | `package.json` (devDependencies)       |

## Présent sur le serveur o2switch

| Élément     | Version | Emplacement            |
| ----------- | ------- | ---------------------- |
| Venv Python | 3.11.15 | `lumosphere/venvs/py311/` (ancien `epuriel/` à supprimer) |
| PyMuPDF     | 1.27.2  | Dans le venv py311     |
| Pillow      | 12.2.0  | Dans le venv py311     |
| LiteLLM     | 1.86.1  | Dans le venv py311     |

## Absent — à installer maintenant (Phase I.2)

_(Tous les éléments prévus ont été installés avec succès en I.2.)_

## Absent — reporté (phases ultérieures)

| Élément                        | Phase | Raison                            |
| ------------------------------ | ----- | --------------------------------- |
| Éditeur Markdown visuel        | I.5   | Évaluation comparative nécessaire |
| yt-dlp, youtube-transcript-api | IV    | Chaîne YouTube                    |
| Ruff                           | IV    | Workers Python                    |
| Tesseract, OCRmyPDF, Poppler   | IV    | PDF scannés (dépend o2switch)     |
| Pandoc                         | VI    | Conversion EPUB                   |

## Reliquats à nettoyer

Aucun reliquat d'anciens projets (Electron, Tauri, Rust) dans le dépôt. Les archives sont dans un dossier séparé.
