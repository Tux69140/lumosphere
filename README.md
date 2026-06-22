# Lumosphère

Application web unique fusionnant l'**atelier de préparation documentaire** (ex-Epuriel) et la **bibliothèque éditoriale validée** (ex-Index Lulumineux), hébergée sur o2switch et **installable en PWA** (Windows/Linux/Mac/Android).

> Dépôt issu de la fusion de `pretraitement` (Epuriel) et `index-lulumineux` (Lumosphère). Voir le devbook de migration et le cahier des charges dans `docs/`.

## Stack

- **Front** : React + Vite, servi en statique sur o2switch, **PWA** (installable, en ligne).
- **API** : PHP (sans framework lourd), compatible o2switch mutualisé.
- **Base** : MySQL/MariaDB unique = source de vérité (atelier + corpus + auth). Validation d'un lot conforme → **intégration directe au corpus** (transaction).
- **Traitements longs** : file de jobs `server_jobs` + cron (`run_jobs.php`).
- **IA** : LiteLLM (cloud), providers configurables.
- **Abstraction** : couche UI/UX + services conservée (portabilité Tauri/natif ultérieure sans réécriture).

## Périmètre

- Phase full-web **en ligne** : pas de mode hors-ligne dans cette phase.
- Un lot est un **espace de travail jetable** (effacé après import en base, sauf mode débogage).
- Authentification serveur (sessions PHP, cookie httpOnly/Secure + CSRF).

## Documentation

- `docs/cahier_des_charges-lumosphere.md` — exigences fonctionnelles.
- `docs/_contexte-ia/` — pack de contexte condensé pour l'IA codeuse (optimisation tokens).
- `docs/4-stack_technique-lumosphere.md`, `docs/2-trame_travail-lumosphere.md`, `docs/conventions_traitement-lumosphere.md`.
- Séquençage : `docs/1-trame_execution-lumosphere.md` (ordre des tâches, point d'entrée).
- Devbooks : `docs/4-devbook_migration_full_web-lumosphere.md` (migration full-web) puis `docs/3-devbook_developpement-lumosphere.md` (bibliothèque / UI documentaire + chaînes).

## Déploiement (o2switch)

- Site à la racine `/home2/mist2786/public_html/` (accès `ssh lumosphere`).
- Secrets hors dépôt (`config/config.php`), base `mist2786_lumosphere`.
