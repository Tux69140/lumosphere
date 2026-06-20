# AGENTS.md — Lumosphère

Instructions pour **tout agent IA** (Codex, Cursor, Copilot, etc.). **La source d'autorité est [`CLAUDE.md`](CLAUDE.md)** — la lire en premier, ainsi que le pack `docs/_contexte-ia/` (condensé, faisant autorité).

## Rappels critiques

- **Migration en cours, rien n'est validé ni codé** : aucune étape acquise sans **validation explicite** du chef de projet.
- **Réponses concises, en français**, vulgarisées (chef de projet non codeur).
- **Sécurité** : aucun secret/URL d'API en dur ni côté navigateur ; auth serveur (sessions PHP `httpOnly`/`Secure` + CSRF) ; secrets hors dépôt.
- **Accès données (DAL)** : tout accès base passe par l'API PHP en **PDO paramètres liés** (jamais de SQL côté front) ; **droits par œuvre appliqués à toutes les lectures** (pas un masquage UI) ; suppression douce filtrée systématiquement.
- **Corpus** : écriture **uniquement** à la validation d'un lot conforme, en **transaction** (intégration ≠ publication) ; pas de staging ni de fichier pivot.
- **Traitements longs** : via `server_jobs` + cron ; jamais dans une requête web.
- **Commiter/pousser uniquement sur demande explicite.**

Détail complet : `CLAUDE.md` et `docs/_contexte-ia/03_conventions-et-regles.md`.
