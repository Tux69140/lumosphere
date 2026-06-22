# CLAUDE.md — Lumosphère

Guide IA. **Réponses concises** (économie de tokens), vulgarisées pour un **chef de projet non codeur**.

## État (IMPORTANT)

**Migration en cours, rien n'est validé ni codé.** Phase 1 = documentation. Aucune étape acquise sans **validation explicite** du chef de projet (cases `- [x]` du devbook = après validation seulement).

Lumosphère = fusion en **une seule app web** de : `pretraitement`/Epuriel (**atelier** de préparation) + `index-lulumineux` (**bibliothèque** éditoriale).

## Références (lire AVANT d'agir)

1. **`docs/_contexte-ia/`** — pack condensé faisant autorité (priorité, en anglais, optimisé tokens).
2. `docs/cahier_des_charges-lumosphere.md` — exigences fonctionnelles détaillées.
3. `docs/4-stack_technique-lumosphere.md` — décisions techniques.
4. `docs/_reference/` — sauvegarde réelle du serveur Epuriel avant fusion (schéma SQL, arbo).

Séquençage : `docs/1-trame_execution-lumosphere.md` (point d'entrée unique pour l'ordre des tâches). Devbooks : `docs/4-devbook_migration_full_web-lumosphere.md` (migration) et `docs/3-devbook_developpement-lumosphere.md` (développement). **Ne pas** se baser sur l'archive des anciens dépôts.

## Stack

React/Vite PWA + PHP API + MySQL/MariaDB · o2switch mutualisé · LiteLLM cloud. Détail : `docs/_contexte-ia/01_architecture.md`.

## Règles (auto-chargées)

Toutes les règles techniques vivent dans `.claude/rules/` (chargées automatiquement, anglais) :
- **security.md** — secrets, auth sessions PHP, CSRF, Gitleaks
- **database.md** — PDO, droits par œuvre, soft-delete, transactions, FULLTEXT, keyset
- **frontend.md** — React/TS/Tailwind, abstraction services, Markdown editor, PWA
- **backend-php.md** — PHP sans framework, DAL, sessions, CORS, server_jobs
- **python-workers.md** — venv py311, workers stdin/stdout, garde anti-résumé
- **testing.md** — matrice de tests, quality gate, perfs, accessibilité
- **conventions.md** — nommage, vocabulaire métier, commits, priorité documentaire

`.claude/settings.json` : permissions, hooks pre-commit (lint + gitleaks) et post-edit (typecheck TS).

## Workflow IA

- **Plan mode** (Shift+Tab) : invoquer le skill `writing-plans` en **premier**, avant tout agent Explore.

## Commandes

Aucun build en place (phase documentation) ; ajoutés avec le code (Phase 2+).
