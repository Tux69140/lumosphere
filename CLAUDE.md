# CLAUDE.md — Lumosphère

Guidage pour Claude Code (et toute IA) travaillant sur ce dépôt.

Produire des réponses **concises** pour économiser des tokens, en vulgarisant pour un **chef de projet non codeur** (compréhension par un non-informaticien).

## État du projet (IMPORTANT)

Projet **en migration**, **rien n'est encore validé ni codé**. Phase en cours : **Phase 1 — documentation**. Ne jamais considérer une étape comme acquise sans **validation explicite** du chef de projet. Les cases `- [x]` du devbook ne sont cochées qu'après validation.

Lumosphère est la fusion de deux anciens projets en **une seule application web** :
- `pretraitement` (Epuriel) = l'**atelier** de préparation documentaire ;
- `index-lulumineux` = la **bibliothèque** éditoriale.

## Documents de référence (à lire AVANT toute action)

1. **`docs/_contexte-ia/`** — pack condensé faisant autorité (à lire en priorité, optimisé tokens) : contexte produit, architecture, schéma de données, conventions/règles, flux/API.
2. `docs/cahier_des_charges-lumosphere.md` — exigences fonctionnelles détaillées.
3. `docs/stack_technique-lumosphere.md` — décisions techniques.
4. `docs/_reference/` — instantané réel du serveur (schéma SQL, arborescence).

Le **devbook de migration** détaillé est dans l'ancien dépôt : `pretraitement/docs/devbook_migration_full_web-lumosphere.md`.

**Ne pas** se fonder sur l'archive des anciens dépôts (redondante, contradictoire).

## Stack (résumé)

React/Vite + **PWA** (installable, en ligne) · API **PHP** · **une base MySQL/MariaDB** = vérité · traitements longs via `server_jobs` + cron · IA **LiteLLM cloud** · auth **sessions PHP**. Hébergement o2switch mutualisé (pas de VPS), site à la racine `/home2/mist2786/public_html/`, accès `ssh lumosphere`.

## Interdits absolus

- Jamais d'URL d'API ni de secret en dur ; jamais de secret côté navigateur.
- Jamais d'écriture directe dans le **corpus** depuis l'atelier (passer par le **staging** + validation humaine).
- Jamais de traitement long dans une requête web (→ `server_jobs` + cron).
- Ne pas produire de fichier pivot `.pivot.json` (remplacé par le staging interne).
- Ne jamais importer le runtime (Electron/Tauri) directement dans un composant React (passer par les services d'abstraction).
- Ne jamais versionner : `config/config.php`, `.env`, `.session`, bases locales, `lots/`, `data/`, `node_modules/`, venvs.
- `apps/pdfmd/` reste un atelier de référence, jamais l'application principale.

## Conventions

- Identifiants techniques en anglais ; libellés utilisateur en **français** (accents corrects).
- TypeScript/React : `PascalCase` composants, `camelCase` fonctions. PHP : simple, sans framework lourd, fonctions internes `epuriel_*` conservées, PDO paramètres liés. Python : PEP8, venv py311.
- Commits conventionnels (`feat(scope):`, `fix(scope):`, `docs(scope):`). Mentionner tout impact sur les données.
- **Commiter/pousser uniquement sur demande explicite.**

## Commandes

Aucune chaîne de build n'est encore en place (Phase documentation). Elles seront ajoutées avec le code (Phase 2+).
