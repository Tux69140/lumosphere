# CLAUDE.md — Lumosphère

Guide pour toute IA travaillant sur ce dépôt. **Réponses concises** (économie de tokens), vulgarisées pour un **chef de projet non codeur**.

## État (IMPORTANT)

**Migration en cours, rien n'est validé ni codé.** Phase 1 = documentation. Aucune étape acquise sans **validation explicite** du chef de projet (cases `- [x]` du devbook = après validation seulement).

Lumosphère = fusion en **une seule app web** de : `pretraitement`/Epuriel (**atelier** de préparation) + `index-lulumineux` (**bibliothèque** éditoriale).

## Références (lire AVANT d'agir)

1. **`docs/_contexte-ia/`** — pack condensé faisant autorité (priorité, en anglais, optimisé tokens).
2. `docs/cahier_des_charges-lumosphere.md` — exigences fonctionnelles détaillées.
3. `docs/stack_technique-lumosphere.md` — décisions techniques.
4. `docs/_reference/` — sauvegarde réelle du serveur Epuriel avant fusion (schéma SQL, arbo).

Devbook détaillé : `pretraitement/docs/devbook_migration_full_web-lumosphere.md`. **Ne pas** se baser sur l'archive des anciens dépôts (redondante, contradictoire).

## Stack

React/Vite + **PWA** (installable, en ligne) · API **PHP** · **une base MySQL/MariaDB** = vérité · traitements longs `server_jobs` + cron · IA **LiteLLM cloud** · auth **sessions PHP forte**. Hébergement o2switch mutualisé (pas de VPS), racine `/home2/mist2786/public_html/`, `ssh lumosphere`.

## Interdits absolus

- Aucun secret/URL d'API en dur ; aucun secret côté navigateur.
- Accès données (DAL) : tout passe par l'API PHP en **PDO paramètres liés** (jamais de SQL côté front) ; **droits par œuvre appliqués à toutes les lectures** ; suppression douce filtrée systématiquement.
- Écriture corpus **uniquement** à la validation d'un lot conforme, en **transaction** (tout ou rien), puis suppression du lot. Pas de staging ni de seconde relecture. **Intégration ≠ publication** : le passage à `Publiée` reste un acte humain distinct (valide les mots-clés proposés par l'IA).
- Aucun traitement long en requête web (→ `server_jobs` + cron).
- Pas de fichier pivot `.pivot.json` (→ intégration directe en corpus).
- Ne pas importer le runtime (Electron/Tauri) dans un composant React (passer par les services d'abstraction).
- Ne jamais versionner : `config/config.php`, `.env`, `.session`, bases locales, `lots/`, `data/`, `node_modules/`, venvs.
- `apps/pdfmd/` = atelier de référence, jamais l'app principale.

## Conventions

- Identifiants techniques en anglais ; libellés utilisateur en **français** (accents corrects).
- React : `PascalCase` composants, `camelCase` fonctions. PHP : sans framework lourd, fonctions `epuriel_*` conservées, PDO paramètres liés. Python : PEP8, venv py311.
- Commits conventionnels (`feat/fix/docs(scope):`) ; signaler tout impact données.
- **Commiter/pousser uniquement sur demande explicite.**

## Commandes

Aucun build en place (phase documentation) ; ajoutés avec le code (Phase 2+).
