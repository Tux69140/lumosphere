# 04 — Flux et API

## Authentification (à créer)
- `POST /auth/login` (email + mot de passe → session PHP, cookie `httpOnly`/`Secure`/`SameSite`).
- `POST /auth/logout`.
- Tous les autres endpoints : vérification de session (remplace `epuriel_require_token`) + CSRF sur actions sensibles.
- Premier démarrage : admin par défaut → changement de mot de passe imposé.

## Flux atelier → staging → corpus
1. **Collecte** : collecteur cron (Telegram/YouTube/HTML) **ou** upload PDF → création d'un **lot** `en_attente` (brut déposé, lot jetable).
2. **Traitement** : étapes par source via `server_jobs` (nettoyage, segmentation, OCR si dispo, enrichissement IA). Workers Python.
3. **Révision** humaine dans l'atelier.
4. **Mise en staging** (étape A) : écriture dans `import_staging_*` ; contrôles de complétude + doublons (hash, `telegram_message_id`). *Remplace l'ancienne génération de fichier pivot.*
5. **Validation** (étape B) : un Éditeur valide → création des entrées dans le **corpus** + application des règles métier. **Puis effacement du dossier du lot.**

## Routes API existantes (réelles, à conserver/adapter)
Lots : `POST /lots/create` · `POST /lots/{id}/0_raw` · `POST /lots/{id}/take` · `POST /lots/{id}/checkpoint` · `POST /lots/{id}/pivot` (**→ écrire en staging** au lieu d'un fichier) · `GET /lots/waiting` · `GET /lots/{id}` · `GET /lots/{id}/files` · `POST /lots/delete[/preview]`.
Telegram : `GET|POST /telegram/sources` · `POST /telegram/lots/create-from-buffer` · `POST /telegram/lots/collect-and-create` · `POST /telegram/history/auth/start|confirm`.
IA : `GET|POST /ia/settings` · `POST /ia/models/refresh|registry/save|test` · `POST /lots/{id}/ia/regenerate`.

**À ajouter** : auth (`/auth/*`), validation du staging (`/staging/*` → promotion vers corpus), consultation/recherche bibliothèque, gestion auteurs/œuvres/thèmes/mots-clés.

## Côté front (rappel)
Tout passe par `apiClient.ts` (`fetch`, `credentials: 'include'`). Les services (`mockServices.ts` → à renommer `webServices`) sont l'unique adaptateur. Le pivot affiché devient le **contenu staging**.

## Recherche
MySQL `FULLTEXT` + collation accent-insensible. Filtres : auteur, œuvre, thème, mots-clés (OU/ET), dates, état (admin), droits par rôle. Pagination keyset, debounce 300 ms, virtualisation > 200.
