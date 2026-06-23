# Spec T07 — Authentification serveur PHP

> **Phase** : T07 de la trame d'exécution (source : Mig §6.2)
> **But** : implémenter la connexion/déconnexion, le blocage après tentatives échouées, l'expiration de session, la création du premier administrateur, et la gestion des sessions actives.
> **Approche** : compléter le code existant (bootstrap.php, auth.php, api.ts). Le socle (sessions sécurisées, CSRF, DAL utilisateurs, base de données auth) est déjà en place.

---

## 1. Connexion (`POST /auth/login`)

L'utilisateur envoie email + mot de passe. Le serveur :

1. Vérifie que le compte n'est pas bloqué (voir §2 blocage).
2. Cherche l'utilisateur par email via `dal_get_user_for_auth()`.
3. Compare le mot de passe avec `password_verify()` (bcrypt).
4. Si OK :
   - Régénère l'identifiant de session (`session_regenerate_id(true)`) pour éviter le détournement de session.
   - Stocke dans la session : `user_id`, `role_id`, `permissions` (chargées depuis `role_permissions`), `last_activity` (horodatage courant).
   - Enregistre la connexion dans `active_sessions` (user_id, hash de l'identifiant de session, IP, navigateur).
   - Réinitialise le compteur de tentatives échouées pour cet email.
   - Renvoie les informations utilisateur (id, prénom, nom, email, rôle).
5. Si échec :
   - Incrémente le compteur de tentatives pour cet email.
   - Renvoie un message générique : « Identifiants incorrects. » (ne pas révéler si c'est l'email ou le mot de passe).

**Pas de jeton CSRF requis** pour le login (le formulaire est accessible sans session).

---

## 2. Blocage après tentatives échouées

- **Seuil** : 5 tentatives ratées.
- **Durée de blocage** : 30 minutes.
- **Stockage** : nouvelle table `login_attempts` (email, attempt_count, last_attempt_at).
- **Remise à zéro** : automatique après 30 minutes sans tentative, ou après une connexion réussie.
- **Message en cas de blocage** : « Trop de tentatives. Réessayez dans X minutes. » (indiquer le temps restant).

---

## 3. Déconnexion (`POST /auth/logout`)

1. Marque la session comme terminée dans `active_sessions` (remplit `invalidated_at`).
2. Détruit la session PHP (`session_destroy()`).
3. Supprime le cookie de session côté navigateur.
4. Renvoie une confirmation.

Côté interface, l'utilisateur est redirigé vers la page d'accueil (bibliothèque en mode visiteur).

---

## 4. Expiration de session (2 heures d'inactivité)

À chaque requête, `bootstrap.php` vérifie `$_SESSION['last_activity']` :
- Si plus de 2 heures (7200 secondes) se sont écoulées → détruire la session, renvoyer HTTP 401 avec le message « Session expirée. ».
- Sinon → mettre à jour `last_activity` à l'heure courante et mettre à jour `last_seen` dans `active_sessions`.

Côté interface, une réponse 401 déclenche la redirection vers l'écran de connexion.

---

## 5. Création du premier administrateur (`POST /auth/setup`)

Quand aucun utilisateur n'existe en base :

1. **Protection par code secret** : un code temporaire est stocké dans la table `config` (clé `setup_secret`). Le formulaire de premier admin exige ce code en plus des informations du compte.
2. **Formulaire** : code secret + prénom + nom + email + mot de passe (min 8 caractères) + confirmation du mot de passe.
3. Le serveur vérifie le code secret, crée l'utilisateur avec le rôle Administrateur (id=1), connecte directement l'utilisateur.
4. **Suppression automatique** : le code secret est supprimé de la table `config` immédiatement après la création du compte. La route `/auth/setup` se désactive définitivement.

**Sécurité** : tant que le premier admin n'est pas créé, toutes les autres routes API (sauf `/auth/setup` et `/auth/csrf`) renvoient une erreur « Application non configurée. ».

Le code secret est défini dans la table `config` via phpMyAdmin lors du déploiement initial, avant d'activer l'application.

---

## 6. Gestion des sessions actives (admin)

La table `active_sessions` enregistre chaque connexion. L'administrateur (permission `admin.sessions`) peut :
- Voir la liste des sessions en cours (utilisateur, IP, navigateur, dernière activité).
- Forcer la déconnexion d'un utilisateur (met `invalidated_at` à la date courante).

À chaque requête, `bootstrap.php` vérifie que la session n'a pas été révoquée par un admin. Si `invalidated_at` est rempli, l'utilisateur est déconnecté immédiatement.

**Purge automatique** : les entrées de plus de 90 jours sont supprimées (conformité RGPD). La purge se fait lors de chaque nouvelle connexion (nettoyage opportuniste, pas de cron dédié).

---

## 7. Nouvelle table `login_attempts`

```sql
CREATE TABLE IF NOT EXISTS login_attempts (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email            VARCHAR(255) NOT NULL,
  attempt_count    INT UNSIGNED NOT NULL DEFAULT 0,
  last_attempt_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_login_attempts_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
```

---

## 8. Fichiers concernés

```
db/migrations/
└── 008_login_attempts.sql          ← créer (table login_attempts)

api/
├── bootstrap.php                   ← compléter (expiration session, vérif révocation admin, blocage setup)
├── dal/
│   └── auth.php                    ← créer (fonctions login, logout, rate-limit, sessions actives, setup)
└── endpoints/
    └── auth.php                    ← compléter (routes login, logout, setup, sessions)

src/
└── services/
    └── api.ts                      ← compléter (méthodes login, logout, setup)
```

---

## 9. Constantes

| Constante | Valeur | Description |
|---|---|---|
| `MAX_LOGIN_ATTEMPTS` | 5 | Tentatives avant blocage |
| `LOCKOUT_DURATION` | 1800 | Durée de blocage en secondes (30 min) |
| `SESSION_IDLE_TIMEOUT` | 7200 | Expiration d'inactivité en secondes (2 h) |
| `SESSION_PURGE_DAYS` | 90 | Rétention des sessions dans active_sessions (RGPD) |
