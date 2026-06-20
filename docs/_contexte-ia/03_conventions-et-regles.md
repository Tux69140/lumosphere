# 03 — Conventions et règles

## Règles métier (couche PHP, à appliquer côté serveur — pas seulement UI)
- État par défaut d'une citation : **À Corriger**.
- **Publiée interdite sans thème** renseigné.
- États système (C/R/P) non supprimables ; rôle Administrateur non supprimable/non réductible.
- Thèmes : **2 niveaux maximum**.
- Mots-clés : **normalisés**, unicité insensible à la casse.
- **Suppression douce** (`deleted_at`) filtrée systématiquement sur toutes les lectures.
- **Droits par œuvre** (`role_oeuvre_access`) appliqués à **toutes** les requêtes de lecture (pas un masquage visuel).
- Validation des entrées avant écriture (côté React + revalidation PHP).
- Édition concurrente : verrou `SELECT … FOR UPDATE` ; un lot = un responsable (`assigned_to`).

## Cycle de vie des lots (jetables)
- Un lot = espace de travail **temporaire**. Après import réussi en staging/corpus → **effacer tout le dossier du lot** (source brute + intermédiaires).
- **Mode débogage** (réglage global + override par lot, **défaut OFF**) : conserve le dossier pour diagnostic.
- Conserver en base : `collect_sources.last_marker` (dernier) + `first_marker` (plus ancien), par source auto-collectée (pas le PDF manuel).
- Pas de `manifest.json`/`journal.csv` par lot ; pas de dossier `*_exports/`. Journal léger en base, élagué. `telegram_updates_buffer` purgé.

## Conventions de code
- **TypeScript/React** : composants `PascalCase`, hooks/fonctions `camelCase`. UI **sans** dépendance runtime (passe par les services). Pas d'Electron.
- **PHP** : simple, lisible, compatible o2switch, sans framework lourd ; fonctions internes `epuriel_*` (conservées) ; PDO paramètres liés.
- **Python** : PEP8, `snake_case`, venv py311. Workers CLI (stdin/stdout JSON), lancés par PHP via `exec()`.
- Identifiants techniques en anglais ; libellés utilisateur en **français** (accents corrects).
- Vocabulaire métier : lot, source, brut, étape, révision, enrichissement, staging, validation, journal.

## Interdits
- Jamais d'URL d'API ni de secret en dur.
- Jamais d'écriture directe dans le **corpus** depuis l'atelier (passer par le staging + validation humaine).
- Jamais de secret côté navigateur (jetons, clés IA, identifiants Telegram).
- Jamais de traitement long dans une requête web (→ `server_jobs` + cron).
- Ne pas produire de fichier pivot `.pivot.json` (remplacé par le staging).
- `apps/pdfmd/` reste un atelier de référence, **jamais l'app principale**.
- Ne pas se baser sur l'archive des anciens dépôts.

## Qualité (avant commit)
`pnpm lint` + `pnpm build` verts + vérification manuelle. Vitest/Playwright (front), Ruff (Python), PHPStan/PHPCS (PHP), Gitleaks (secrets, incl. auth).
