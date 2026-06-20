# 01 — Architecture

## Vue d'ensemble
```
Navigateur (PWA)  --HTTPS, même origine-->  API PHP (o2switch)  --PDO-->  MySQL unique
  React/Vite                                      |                    [atelier|staging|corpus|auth]
  couche d'abstraction (services)                 |
                                          server_jobs + cron --> workers Python (venv py311)
```

## Front
- React 19 + Vite + TypeScript + Tailwind (charte orange/violet/gris, clair-sombre).
- **PWA** : `manifest.json` + service worker minimal (installable ; **pas de cache hors-ligne**). Magasins via PWABuilder (MSIX, TWA + `assetlinks.json`).
- **Responsive** desktop/tablette/mobile (l'UI actuelle est « bureau d'abord », à adapter).
- **Abstraction obligatoire** : l'UI n'appelle jamais le runtime ; elle passe par le contrat `EpurielServices` (`abstraction/uiContract.ts`, `services/`). Un seul adaptateur aujourd'hui (Web/`fetch`). Persistance réglages = `localStorage`.

## API PHP
- Routeur unique + `bootstrap.php` (CORS, config, PDO, helpers). Fonctions préfixées `epuriel_*` (conservées).
- Config sensible **hors dépôt** : `config/config.php` (db_*, lots_root, python_bin, timezone, clés IA). Jamais d'URL/secret en dur.
- **Auth par session** (remplace le jeton `X-Epuriel-Token`). Tous les endpoints vérifient la session.
- PDO **paramètres liés** uniquement.

## Traitements longs
Tout traitement lourd → table **`server_jobs`** dépilée par cron **`run_jobs.php`**. Jamais d'`exec()` long dans une requête web. Pas de Celery/RQ/Redis. Workers **Python** lancés via `exec()`.

## IA
LiteLLM (cloud). Providers configurables, défaut `gemini`, allowlist des modèles, clés en config serveur.

## Contraintes o2switch (mutualisé, pas de VPS)
| | |
|---|---|
| PHP | 8.1.34 (web+cli) · MariaDB 11.4.12 |
| `exec()`/cron | OK (`/usr/local/bin/php`) |
| Python | **système 3.6.8 inutilisable → venv py311** |
| OK | PyMuPDF, Pillow, LiteLLM, Ghostscript (`/usr/bin/gs`) |
| **ABSENTS** | Tesseract, OCRmyPDF, Poppler, Pandoc |
| Non | VPS, GPU, processus persistant (→ Ollama local abandonné) |

→ Chaîne **PDF OCR contrainte** ; **EPUB Pandoc** (phase 3) = binaire à embarquer.

## Déploiement
Site à la **racine** `/home2/mist2786/public_html/` (build React + API PHP, même origine). Accès `ssh lumosphere`. Base `mist2786_lumosphere`, user applicatif `mist2786_lumo_usr` (SELECT/INSERT/UPDATE/DELETE only).
