# Design — Gestion des mots de passe utilisateurs

**Date :** 2026-06-30
**Branche :** `feat/gestion-mots-de-passe` (depuis `main`)
**Statut :** design validé, à implémenter en 4 phases

## Objectif

Renforcer et fiabiliser la gestion des mots de passe :

1. Contrôler les mots de passe selon des règles de force adaptées au rôle.
2. Permettre à chaque utilisateur de **définir lui-même** son mot de passe via un email d'invitation.
3. Offrir un parcours **« mot de passe oublié »**.
4. Mettre en place l'infrastructure email de l'hébergement, sans rien coder en dur et facile à faire évoluer.

## État de départ (existant)

- Connexion fonctionnelle : login, sessions, anti-brute-force (5 essais / 30 min), bcrypt cost 12.
- **Seule règle actuelle :** « ≥ 8 caractères », dupliquée à 4 endroits (`api/dal/auth.php`, `api/dal/users.php` ×2, `src/features/admin/UserFormModal.tsx`). Aucune logique par rôle.
- **Aucune infrastructure email** (PHPMailer non installé, aucun SMTP). Spécifié dans la doc mais non codé.
- **Aucun parcours libre-service** : ni « définir/changer mon mot de passe », ni « mot de passe oublié ». Seul un admin réinitialise à la main via `dal_update_user`.
- Rôles (constantes `api/dal/core.php`) : `ROLE_ADMIN=1`, `ROLE_EDITEUR=2`, `ROLE_VISITEUR=3`, `ROLE_ABO3=4`, `ROLE_ABO4=5`.
- Config serveur hors dépôt (`config/config.php`), exemple versionné `config/config.php.example`. Pas de section SMTP.

## Décisions de cadrage

| Sujet | Décision |
|---|---|
| Force du mot de passe | Règle de longueur par rôle **+** jauge de robustesse intelligente |
| Abonnés (Abo3/Abo4) | ≥ 8 caractères, **pas** de jauge affichée, refus du « franchement faible » uniquement |
| Éditeur / Admin | ≥ 12 caractères **ET** niveau « fort » (jauge verte) obligatoire |
| Premier mot de passe | Toujours défini par l'utilisateur via email d'invitation — l'admin ne saisit jamais de mot de passe |
| Dépannage manuel admin | **Supprimé** — l'admin déclenche uniquement « renvoyer l'invitation » / réinitialisation par mail |
| Changement de son propre mot de passe | Pas d'écran dédié — passe par le parcours « mot de passe oublié » |
| Adresse d'expéditeur | `comptes@lumosphere.org` (expéditeur), `contact@lumosphere.org` (répondre à) — à créer dans le cPanel o2switch |
| Comptes existants | Non impactés — nouvelles règles appliquées seulement à la prochaine définition de mot de passe, pas de réinitialisation forcée |

## Échelle de robustesse

L'estimateur (famille zxcvbn) renvoie un score 0–4, traduit en barre :

- **Rouge (faible)** : score 0–1 → refusé pour tous.
- **Orange (moyen)** : score 2 → suffisant pour un abonné.
- **Vert (fort)** : score 3–4 → exigé pour Éditeur/Admin.

Pour pouvoir exiger « fort » **côté serveur** (et pas seulement dans le navigateur), le serveur embarque le même estimateur via le portage PHP de zxcvbn — les scores correspondent à ceux de la jauge navigateur.

---

## Phase 1 — Règles de mot de passe

**But :** un **gardien unique** côté serveur qui décide si un mot de passe est acceptable. Fin de la règle dupliquée à 4 endroits.

### Serveur (autorité)

- Nouvelle fonction centrale, p. ex. `dal_auth_validate_password(string $password, int $role_id): array` retournant `[]` si OK, sinon la liste des motifs de refus.
- Règles appliquées :
  - **Longueur mini par rôle** : 8 pour Visiteur/Abo3/Abo4, 12 pour Éditeur/Admin.
  - **Liste noire** des mots de passe les plus courants.
  - **Ressemblance** refusée avec l'email (partie locale), le nom/prénom, « lumosphere ».
  - **Score de robustesse** via portage PHP de zxcvbn : Éditeur/Admin ≥ 3 (« fort ») ; abonnés pas d'exigence de score au-delà du refus « faible ».
- Tous les points d'entrée qui définissent un mot de passe appellent ce gardien : création du premier admin (`setup`), définition par invitation (phase 3), réinitialisation (phase 4).

### Navigateur (confort)

- Jauge « faible/moyen/fort » en direct sous le champ, basée sur zxcvbn-ts (chargé à la demande pour ne pas alourdir le bundle).
- **Affichée seulement pour Éditeur/Admin** ; pour un abonné, simple indication « au moins 8 caractères ».
- Bouton « Valider » bloqué tant que le seuil du rôle n'est pas atteint.
- Le serveur revalide **toujours** (le navigateur peut être contourné).

### Nettoyage

- Centraliser/retirer les règles « ≥ 8 » éparpillées au profit du gardien unique.

---

## Phase 2 — Tuyauterie email

**But :** socle d'envoi de mails fiable, invisible pour l'utilisateur, base des phases 3 et 4.

### Dépendance

- Installer **PHPMailer** via Composer (choix déjà acté dans la doc).

### Configuration (jamais en dur)

- Ajouter une section `smtp` à `config/config.php` : `host`, `port`, `encryption`, `username` (`comptes@`), `password`, `from_email`, `from_name`, `reply_to` (`contact@`).
- Refléter cette section, vide/à remplir, dans `config/config.php.example`.
- Un changement d'hébergeur ou de boîte = modifier uniquement la config.

### Fonction d'envoi unique

- Module mailer (p. ex. `api/lib/mailer.php`) exposant une fonction `send_mail($to, $subject, $html_body, $text_body)` qui parle au SMTP via PHPMailer. Point d'entrée unique pour tout envoi.

### Table des jetons (liens à usage unique)

Nouvelle table (script SQL fourni, à créer via **phpMyAdmin** — l'accès SSH n'a pas les droits DDL) :

- `id`, `user_id` (FK), `token_hash` (empreinte SHA-256 — **jamais** le jeton en clair), `type` ENUM(`invite`, `reset`), `expires_at`, `used_at` (NULL tant qu'inutilisé), `created_at`, `created_ip`.
- **Usage unique** + **expiration**. Validité : `invite` = 7 jours, `reset` = 1 heure.
- Le jeton en clair voyage uniquement dans l'URL du mail ; en base on ne stocke que son empreinte.

### Gabarits de mail

- Deux gabarits HTML (mise en forme inline) : « invitation » et « mot de passe oublié ». Version texte de repli incluse.

### Validation

- **Test d'envoi réel depuis le serveur** (mutualisé o2switch peut avoir des réglages SMTP particuliers) avant de considérer la phase terminée.

### Suivi des comptes (prérequis phase 3)

- Ajouter à `users` un repère de compte « pas encore activé », p. ex. `password_set_at DATETIME NULL` (NULL = mot de passe jamais défini). À créer via phpMyAdmin.

---

## Phase 3 — Invitation par email

**But :** l'admin ne saisit jamais de mot de passe ; l'utilisateur le définit lui-même.

### Parcours

1. L'admin crée le compte avec **prénom + nom + email + rôle** (le champ mot de passe disparaît de la création).
2. Le compte est créé « en attente » (`password_set_at` NULL) ; la connexion lui est refusée avec un message clair.
3. Le site envoie automatiquement le mail « Définissez votre mot de passe » avec un lien personnel (jeton `invite`, 7 jours).
4. L'utilisateur arrive sur une page publique « Définir mon mot de passe ». La page connaît son rôle (renvoyé par l'API à partir du jeton) → applique les bonnes règles (jauge verte pour Éditeur, simple longueur pour abonné).
5. Mot de passe choisi → `password_set_at` renseigné → jeton consommé → connexion possible.

### Détails

- Lien expiré/déjà utilisé → page explicative proposant de demander un nouvel envoi.
- L'admin peut **« renvoyer l'invitation »** : nouveau jeton, ancien annulé.
- Côté admin, statut visible du compte (« invitation envoyée », « actif »).

### Endpoints (indicatif)

- `GET auth/token-info?token=…` → validité + rôle (pour la jauge), sans exposer d'info sensible.
- `POST auth/set-password` → `{ token, password }` : valide via le gardien (phase 1), pose le mot de passe, marque le jeton utilisé et `password_set_at`.

### Code touché

- `api/dal/users.php` : `dal_create_user` ne reçoit plus de mot de passe ; génère le jeton + déclenche l'envoi. **Retrait du champ mot de passe** aussi de `dal_update_user`.
- Connexion : refus tant que `password_set_at` est NULL (message dédié).
- Frontend : nouvel écran public « Définir mon mot de passe » ; `UserFormModal.tsx` (retrait du champ mot de passe, ajout statut + bouton « renvoyer »).

---

## Phase 4 — Mot de passe oublié

**But :** réinitialisation autonome, réutilisant la mécanique de la phase 3.

### Parcours

1. Lien **« Mot de passe oublié ? »** sur la page de connexion.
2. Saisie de l'email → validation.
3. Le serveur répond **toujours** le même message neutre (« Si un compte existe pour cette adresse, un mail vient d'être envoyé »), que le compte existe ou non (**anti-énumération**).
4. Si le compte existe : mail avec lien (jeton `reset`, 1 heure).
5. Lien → **même page** que l'invitation (« Choisir un nouveau mot de passe »), mêmes règles selon le rôle.
6. Mot de passe défini → jeton consommé → connexion possible.

### Garde-fous

- **Limitation des demandes** par email **et** par IP (réutilise le principe anti-essais existant) pour éviter le bombardement de mails et la saturation d'envoi.
- Réutilise la table de jetons (type `reset`) et l'écran « set-password » de la phase 3 — aucune nouvelle table ni nouvel écran de saisie.

### Endpoints (indicatif)

- `POST auth/forgot-password` → `{ email }` : génère le jeton + envoie le mail si le compte existe, réponse neutre dans tous les cas.

### Code touché

- Frontend : écran public « Mot de passe oublié » + lien sur `LoginPage.tsx`.
- Serveur : endpoint `forgot-password` (muet sur l'existence du compte) + rate-limiting.

---

## Sécurité — points transversaux

- Jetons : seul le **hash** est stocké, usage unique, expiration courte pour `reset`.
- Réponses neutres sur l'existence d'un compte (anti-énumération).
- Rate-limiting sur « mot de passe oublié » (email + IP).
- Le serveur revalide **toujours** la force du mot de passe, indépendamment du navigateur.
- Aucun secret en dur : SMTP et identifiants dans `config/config.php` (hors dépôt).
- Bcrypt cost 12 conservé pour le stockage.

## Tests (rappel matrice projet)

- **Règle métier (gardien de mot de passe)** : tests unitaires PHP — seuils par rôle, liste noire, ressemblance, score.
- **Endpoints** (`set-password`, `forgot-password`, `token-info`) : tests API sur compte de démo, dont cas jeton expiré/déjà utilisé et réponse neutre.
- **Parcours e2e** : invitation → définition de mot de passe → connexion ; mot de passe oublié → réinitialisation → connexion.
- **PHP** : `php -l` + PHPStan + PHPCS. **Frontend** : lint + build + Vitest pour la jauge. **Gitleaks** avant commit (aucun secret SMTP versionné).

## Prérequis opérationnels (côté chef de projet)

- Créer la boîte `comptes@lumosphere.org` dans le cPanel o2switch (réglages SMTP exacts fournis à la phase 2).
- Appliquer les scripts SQL (table jetons + colonne `password_set_at`) via phpMyAdmin.

## Hors périmètre (v1)

- Double authentification (2FA) — exclue par la doc produit.
- Écran « changer mon mot de passe » connecté — couvert par le parcours « mot de passe oublié ».
- Inscription publique en libre-service — comptes créés par l'admin uniquement.
