# Gestion des mots de passe — Plan d'implémentation

> **Pour les workers agentiques :** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Implémenter les 4 phases de gestion des mots de passe : règles de force par rôle, invitation par email, mot de passe oublié, tuyauterie SMTP.

**Architecture :** Un gardien unique PHP (`dal_password_validate()`) centralise toutes les règles. Les jetons d'invitation/réinitialisation sont créés par le DAL, envoyés par les endpoints via PHPMailer. Le hash SHA-256 du jeton est seul stocké en base (jeton en clair uniquement dans l'URL du mail). Frontend : jauge zxcvbn-ts (lazy-loaded) pour Éditeur/Admin, pages publiques SetPassword et ForgotPassword.

**Tech Stack :** PHP 8.1 · PHPMailer 6 · PHPUnit 13 · React 19 · TypeScript · Tailwind CSS · zxcvbn-ts · Vitest · Zod

## Global Constraints

- PHP 8.1.34 (o2switch) — syntaxe PHP 8.1 uniquement
- Bcrypt cost 12 conservé : `password_hash($pwd, PASSWORD_BCRYPT, ['cost' => 12])`
- Rôles : `ROLE_ADMIN=1`, `ROLE_EDITEUR=2`, `ROLE_VISITEUR=3`, `ROLE_ABO3=4`, `ROLE_ABO4=5` (constantes dans `api/dal/core.php`)
- Aucun secret en dur — SMTP dans `config/config.php` (hors dépôt)
- SQL appliqué via phpMyAdmin (SSH sans droits DDL) ; script SQL également appliqué à `lumosphere_test` en local
- Tests PHPUnit : `beginTransaction` dans `setUp`, `rollBack` dans `tearDown`
- Commandes : `vendor/bin/phpunit`, `php -l`, `vendor/bin/phpstan`, `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm tsc --noEmit`, `gitleaks detect -v` (bloquant)
- Commits : Conventional Commits — `feat|fix|refactor|test(scope): message`
- La jauge est masquée pour les abonnés ; pour Éditeur/Admin elle est affichée et le bouton est bloqué tant que le niveau « Fort » n'est pas atteint

---

## Cartographie des fichiers

### Nouveaux fichiers
| Fichier | Responsabilité |
|---|---|
| `db/migrations/018_password_tokens.sql` | Colonne `users.password_set_at`, table `password_tokens`, table `password_reset_attempts` |
| `db/rollback/018_password_tokens_rollback.sql` | Rollback de la migration |
| `api/dal/password_policy.php` | `dal_password_validate()` — gardien unique |
| `api/lib/mailer.php` | `send_mail()` — envoi SMTP via PHPMailer |
| `api/templates/mail_invite.php` | Gabarit HTML email invitation |
| `api/templates/mail_reset.php` | Gabarit HTML email mot de passe oublié |
| `api/dal/password_tokens.php` | `dal_token_create()`, `dal_token_find_valid()`, `dal_token_consume()`, `dal_token_revoke_user_tokens()` |
| `tests/dal/PasswordPolicyTest.php` | Tests unitaires du gardien |
| `tests/dal/PasswordTokensTest.php` | Tests unitaires des jetons |
| `src/hooks/usePasswordStrength.ts` | Hook React — score zxcvbn-ts (lazy) |
| `src/features/auth/PasswordStrengthMeter.tsx` | Composant jauge faible/moyen/fort |
| `src/features/auth/SetPasswordPage.tsx` | Page publique « Définir mon mot de passe » |
| `src/features/auth/ForgotPasswordPage.tsx` | Page publique « Mot de passe oublié » |

### Fichiers modifiés
| Fichier | Changement |
|---|---|
| `composer.json` | Ajouter `"phpmailer/phpmailer": "^6.9"` dans `require` |
| `api/bootstrap.php` | Charger `vendor/autoload.php`, stocker config dans `$GLOBALS['app_config']`, exempter les nouvelles routes publiques |
| `config/config.php.example` | Ajouter section `smtp` |
| `api/dal/auth.php` | `dal_auth_create_first_admin` → utilise `dal_password_validate()` ; `dal_get_user_for_auth` → retourne `password_set_at` |
| `api/dal/users.php` | `dal_create_user` sans password → retourne token brut ; `dal_update_user` sans champ password ; nouveau `dal_resend_invite()` ; `dal_find_users` inclut `is_activated` |
| `api/endpoints/auth.php` | Ajouter `token-info`, `set-password`, `forgot-password` |
| `api/endpoints/users.php` | Ajouter action `resend-invite` |
| `tests/dal/bootstrap.php` | `reset_test_db()` inclut `password_tokens`, `password_reset_attempts` |
| `src/services/api.ts` | Nouveaux types et méthodes (`tokenInfo`, `setPassword`, `forgotPassword`, `resendInvite`), mise à jour `createUser` / `findUsers` |
| `src/features/admin/UserFormModal.tsx` | Retirer champs password/confirm, ajouter badge statut + bouton « Renvoyer l'invitation » |
| `src/App.tsx` | Routes `/definir-mot-de-passe` et `/mot-de-passe-oublie` sous `AuthLayout` |

---

## Task 1 : Migration SQL

**Files :**
- Create : `db/migrations/018_password_tokens.sql`
- Create : `db/rollback/018_password_tokens_rollback.sql`

**Interfaces :**
- Produces : colonne `users.password_set_at DATETIME NULL`, table `password_tokens`, table `password_reset_attempts` — utilisées par toutes les tâches suivantes

- [ ] **Step 1 : Écrire le script de migration**

```sql
-- db/migrations/018_password_tokens.sql
-- Colonne de suivi d'activation du compte
ALTER TABLE users
    ADD COLUMN password_set_at DATETIME NULL DEFAULT NULL AFTER updated_at;

-- Les comptes existants ont déjà un mot de passe : marquer comme activés
UPDATE users SET password_set_at = created_at WHERE password_set_at IS NULL;

-- Table des jetons à usage unique (invitation + réinitialisation)
CREATE TABLE password_tokens (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    token_hash CHAR(64)     NOT NULL COMMENT 'SHA-256 hex du jeton brut',
    type       ENUM('invite','reset') NOT NULL,
    expires_at DATETIME     NOT NULL,
    used_at    DATETIME     NULL DEFAULT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_ip VARCHAR(45)  NOT NULL DEFAULT '',
    UNIQUE KEY uq_token_hash (token_hash),
    INDEX      idx_user_type (user_id, type),
    CONSTRAINT fk_pt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- Table de rate-limiting pour les demandes de réinitialisation par email
CREATE TABLE password_reset_attempts (
    email           VARCHAR(255) NOT NULL,
    attempt_count   INT          NOT NULL DEFAULT 1,
    last_attempt_at DATETIME     NOT NULL,
    PRIMARY KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
```

- [ ] **Step 2 : Écrire le rollback**

```sql
-- db/rollback/018_password_tokens_rollback.sql
DROP TABLE IF EXISTS password_reset_attempts;
DROP TABLE IF EXISTS password_tokens;
ALTER TABLE users DROP COLUMN IF EXISTS password_set_at;
```

- [ ] **Step 3 : Appliquer via phpMyAdmin**

  Coller le contenu de `018_password_tokens.sql` dans l'onglet SQL de phpMyAdmin sur :
  - La base de production (`lumosphere`)
  - La base de test locale (`lumosphere_test`)

  Vérifier : `DESCRIBE users` montre `password_set_at` ; `SHOW TABLES` inclut `password_tokens` et `password_reset_attempts`.

- [ ] **Step 4 : Mettre à jour `reset_test_db` dans les tests**

Modifier `tests/dal/bootstrap.php`, dans `reset_test_db()`, ajouter les nouvelles tables à la liste de TRUNCATE :

```php
$tables = ['citations', 'citation_keywords', 'keywords', 'themes', 'oeuvres', 'auteurs',
           'users', 'user_favorites', 'role_oeuvre_access',
           'active_sessions', 'login_attempts', 'login_attempts_ip', 'notifications',
           'mediatheque', 'bibliotheque', 'emojis', 'export_jobs', 'config',
           'collect_sources', 'password_tokens', 'password_reset_attempts'];
```

- [ ] **Step 5 : Commit**

```bash
git add db/migrations/018_password_tokens.sql db/rollback/018_password_tokens_rollback.sql tests/dal/bootstrap.php
git commit -m "feat(auth): migration 018 — password_tokens + password_set_at"
```

---

## Task 2 : Gardien de mot de passe (Phase 1 backend)

**Files :**
- Create : `api/dal/password_policy.php`
- Modify : `api/dal/auth.php` (lignes 211-216 et 218-229)
- Create : `tests/dal/PasswordPolicyTest.php`

**Interfaces :**
- Produces :
  - `dal_password_validate(string $password, int $role_id, string $email, string $prenom, string $nom): string[]` — retourne `[]` si OK, sinon tableau de messages d'erreur
- Consumes : constantes `ROLE_ADMIN`, `ROLE_EDITEUR` de `api/dal/core.php`

- [ ] **Step 1 : Écrire les tests en premier**

```php
<?php
// tests/dal/PasswordPolicyTest.php
declare(strict_types=1);
namespace Tests\Dal;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../api/dal/core.php';
require_once __DIR__ . '/../../api/dal/password_policy.php';

class PasswordPolicyTest extends TestCase
{
    // Abonnés : min 8 caractères
    public function testAbo3AcceptsEightChars(): void
    {
        $this->assertSame([], dal_password_validate('abcdefgh', ROLE_ABO3));
    }

    public function testAbo3RejectsSevenChars(): void
    {
        $errors = dal_password_validate('abcdefg', ROLE_ABO3);
        $this->assertNotEmpty($errors);
    }

    // Éditeur/Admin : min 12 caractères
    public function testAdminRejectsElevenChars(): void
    {
        $errors = dal_password_validate('abcdefghijk', ROLE_ADMIN);
        $this->assertNotEmpty($errors);
    }

    public function testEditeurRejectsTwelveCharsIfWeak(): void
    {
        // 12 chars mais toutes minuscules = pas fort
        $errors = dal_password_validate('abcdefghijkl', ROLE_EDITEUR);
        $this->assertNotEmpty($errors);
    }

    public function testAdminAcceptsTwelveCharsStrong(): void
    {
        // 12 chars avec 3 classes = fort
        $errors = dal_password_validate('Abcdefg1234!', ROLE_ADMIN);
        $this->assertSame([], $errors);
    }

    public function testAdminAcceptsTwentyCharsAllLower(): void
    {
        // ≥ 20 chars = acceptable même sans diversité (phrase de passe)
        $errors = dal_password_validate('monchatesteunprogrammeur', ROLE_ADMIN);
        $this->assertSame([], $errors);
    }

    // Liste noire
    public function testBlacklistRejected(): void
    {
        $errors = dal_password_validate('motdepasse', ROLE_ABO3);
        $this->assertNotEmpty($errors);
    }

    public function testBlacklistCaseInsensitive(): void
    {
        $errors = dal_password_validate('MOTDEPASSE', ROLE_ABO3);
        $this->assertNotEmpty($errors);
    }

    // Ressemblance contexte utilisateur
    public function testRejectsPasswordContainingPrenom(): void
    {
        $errors = dal_password_validate('Jean1234!XYZ', ROLE_ADMIN, 'jean@test.com', 'Jean', 'Dupont');
        $this->assertNotEmpty($errors);
    }

    public function testRejectsPasswordContainingEmailLocal(): void
    {
        $errors = dal_password_validate('testuser1234!A', ROLE_ADMIN, 'testuser@test.com', 'Jean', 'Dupont');
        $this->assertNotEmpty($errors);
    }

    public function testAcceptsPasswordUnrelatedToUser(): void
    {
        $errors = dal_password_validate('Pluie&Soleil99!', ROLE_ADMIN, 'jean@test.com', 'Jean', 'Dupont');
        $this->assertSame([], $errors);
    }

    // Règle de force Admin/Éditeur
    public function testAdminRequiresThreeCharClasses(): void
    {
        // 14 chars mais 2 classes seulement (minuscules + majuscules)
        $errors = dal_password_validate('AbcDefGhiJklMn', ROLE_ADMIN);
        $this->assertNotEmpty($errors);
    }

    public function testAdminAcceptsThreeCharClasses(): void
    {
        $errors = dal_password_validate('AbcDefGhi123', ROLE_ADMIN);
        $this->assertSame([], $errors);
    }
}
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
vendor/bin/phpunit tests/dal/PasswordPolicyTest.php
```

Attendu : FAIL — `dal_password_validate` non définie.

- [ ] **Step 3 : Implémenter `api/dal/password_policy.php`**

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/core.php';

const PASSWORD_BLACKLIST = [
    'password', 'motdepasse', '12345678', '123456789', '1234567890',
    'password1', 'qwerty', 'azerty', 'iloveyou', 'lumosphere',
    'admin', 'welcome', 'letmein', 'monkey', 'dragon',
];

/**
 * Valide un mot de passe selon les règles du rôle.
 * Retourne [] si valide, sinon un tableau de messages d'erreur.
 *
 * @param string $email  Email de l'utilisateur (pour vérifier la ressemblance)
 * @param string $prenom Prénom (idem)
 * @param string $nom    Nom (idem)
 */
function dal_password_validate(
    string $password,
    int $role_id,
    string $email = '',
    string $prenom = '',
    string $nom = ''
): array {
    $errors = [];
    $is_privileged = in_array($role_id, [ROLE_ADMIN, ROLE_EDITEUR], true);
    $min_length = $is_privileged ? 12 : 8;
    $len = mb_strlen($password);

    if ($len < $min_length) {
        $errors[] = "Le mot de passe doit contenir au moins {$min_length} caractères.";
        return $errors;
    }

    // Liste noire (insensible à la casse)
    $lower = mb_strtolower($password);
    if (in_array($lower, PASSWORD_BLACKLIST, true)) {
        $errors[] = 'Ce mot de passe est trop commun, choisissez-en un autre.';
    }

    // Ressemblance avec le contexte utilisateur (prénom ≥ 4 lettres, nom ≥ 4, partie locale de l'email)
    $context_words = array_filter([
        mb_strlen($prenom) >= 4 ? mb_strtolower($prenom) : '',
        mb_strlen($nom)    >= 4 ? mb_strtolower($nom)    : '',
        mb_strtolower((string) strstr($email, '@', true)),
    ], fn($w) => $w !== '');
    foreach ($context_words as $word) {
        if (str_contains($lower, $word)) {
            $errors[] = 'Le mot de passe ne doit pas contenir votre prénom, nom ou identifiant email.';
            break;
        }
    }

    // Niveau « Fort » obligatoire pour Éditeur/Admin
    // Règle : ≥ 3 classes de caractères sur 4, OU ≥ 20 caractères (phrase de passe)
    if ($is_privileged && empty($errors)) {
        $classes = 0;
        if (preg_match('/[a-z]/', $password)) $classes++;
        if (preg_match('/[A-Z]/', $password)) $classes++;
        if (preg_match('/[0-9]/', $password)) $classes++;
        if (preg_match('/[^A-Za-z0-9]/u', $password)) $classes++;

        if ($len < 20 && $classes < 3) {
            $errors[] = 'Pour les comptes éditeur et administrateur, le mot de passe doit mélanger au moins 3 types de caractères (minuscules, majuscules, chiffres, symboles), ou faire au moins 20 caractères.';
        }
    }

    return $errors;
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
vendor/bin/phpunit tests/dal/PasswordPolicyTest.php
```

Attendu : OK, 14 tests passent.

- [ ] **Step 5 : Intégrer dans `dal_auth_create_first_admin` (`api/dal/auth.php`)**

Ajouter `require_once __DIR__ . '/password_policy.php';` en haut de `api/dal/auth.php` (après les require existants).

Remplacer les lignes 211-216 (validation password dans `dal_auth_create_first_admin`) :

Ancien code :
```php
    if (mb_strlen($password) < 8) {
        return dal_error('Le mot de passe doit contenir au moins 8 caractères.');
    }
```

Nouveau code :
```php
    $pwd_errors = dal_password_validate(
        $password,
        ROLE_ADMIN,
        $email,
        $prenom,
        $nom
    );
    if (!empty($pwd_errors)) {
        return dal_error($pwd_errors[0]);
    }
```

Aussi supprimer le `password_hash` dans cet endpoint car `dal_auth_create_first_admin` reçoit encore un mot de passe (l'admin setup est la seule exception — premier démarrage, pas d'email disponible). Garder le `password_hash($password, PASSWORD_BCRYPT, ['cost' => 12])` et ajouter `password_set_at = NOW()` dans l'INSERT :

```php
    $stmt->execute([
        'prenom'           => $prenom,
        'nom'              => $nom,
        'email'            => $email,
        'password_hash'    => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
        'role_id'          => ROLE_ADMIN,
        'password_set_at'  => date('Y-m-d H:i:s'),
    ]);
```

Et la requête SQL dans `dal_auth_create_first_admin` :
```php
    $stmt = $pdo->prepare(
        'INSERT INTO users (prenom, nom, email, password_hash, role_id, password_set_at)
         VALUES (:prenom, :nom, :email, :password_hash, :role_id, :password_set_at)'
    );
```

- [ ] **Step 6 : Vérifier la syntaxe**

```bash
php -l api/dal/password_policy.php
php -l api/dal/auth.php
vendor/bin/phpunit tests/dal/AuthTest.php
```

Attendu : pas d'erreur, tests AuthTest passent.

- [ ] **Step 7 : Commit**

```bash
git add api/dal/password_policy.php api/dal/auth.php tests/dal/PasswordPolicyTest.php
git commit -m "feat(auth): gardien unique dal_password_validate() — règles par rôle"
```

---

## Task 3 : PHPMailer + tuyauterie email (Phase 2)

**Files :**
- Modify : `composer.json`
- Modify : `api/bootstrap.php`
- Modify : `config/config.php.example`
- Create : `api/lib/mailer.php`
- Create : `api/templates/mail_invite.php`
- Create : `api/templates/mail_reset.php`

**Interfaces :**
- Produces :
  - `send_mail(string $to_email, string $to_name, string $subject, string $html_body, string $text_body): void`
  - `mail_template_invite(string $prenom, string $set_url, int $expires_days): array` → `['subject' => ..., 'html' => ..., 'text' => ...]`
  - `mail_template_reset(string $prenom, string $reset_url): array` → `['subject' => ..., 'html' => ..., 'text' => ...]`
- Consumes : `$GLOBALS['app_config']['smtp']` (tableau avec host/port/encryption/username/password/from_email/from_name/reply_to)

- [ ] **Step 1 : Ajouter PHPMailer à `composer.json`**

```json
{
    "name": "lumosphere/api",
    "description": "Lumosphère DAL",
    "type": "project",
    "require": {
        "phpmailer/phpmailer": "^6.9"
    },
    "require-dev": {
        "phpunit/phpunit": "^13.2",
        "phpstan/phpstan": "^2.2",
        "squizlabs/php_codesniffer": "^4.0"
    }
}
```

- [ ] **Step 2 : Installer PHPMailer**

```bash
composer install
```

Attendu : dossier `vendor/` créé ou mis à jour, `vendor/phpmailer/phpmailer/` présent.

- [ ] **Step 3 : Modifier `api/bootstrap.php` — charger autoload + stocker config globalement**

Ajouter juste après la ligne 1 (`<?php`) et avant `declare(strict_types=1)` NON — ajouter après `declare(strict_types=1);`, avant la fonction `_clear_session()` :

```php
// Composer autoload (PHPMailer et autres dépendances)
$_composer_autoload = dirname(__DIR__) . '/vendor/autoload.php';
if (file_exists($_composer_autoload)) {
    require_once $_composer_autoload;
}
unset($_composer_autoload);
```

Puis, après la ligne `$config = require dirname(__DIR__) . '/config/config.php';`, ajouter :

```php
$GLOBALS['app_config'] = $config;
```

Ajouter aussi les nouvelles routes publiques dans le bloc de routes exemptées (ligne 68, dans le `if` existant) :

Ancien :
```php
if ($first_segment === 'auth' && in_array($second_segment, ['csrf', 'setup', 'login'], true)) {
```

Nouveau :
```php
if ($first_segment === 'auth' && in_array($second_segment, ['csrf', 'setup', 'login', 'token-info', 'set-password', 'forgot-password'], true)) {
```

Et dans la vérification CSRF (ligne 129), ajouter à `$is_csrf_exempt` :

Ancien :
```php
$is_csrf_exempt = ($first_segment === 'auth' && in_array($second_segment, ['login', 'setup'], true));
```

Nouveau :
```php
$is_csrf_exempt = ($first_segment === 'auth' && in_array($second_segment, ['login', 'setup', 'set-password', 'forgot-password'], true));
```

- [ ] **Step 4 : Ajouter la section smtp à `config/config.php.example`**

Après la clé `setup_secret` dans le tableau retourné, ajouter :

```php
    // SMTP — envoi d'emails (invitation, réinitialisation de mot de passe)
    // Créer la boîte comptes@lumosphere.org dans le cPanel o2switch avant de remplir.
    'smtp' => [
        'host'       => 'mail.lumosphere.org',  // serveur SMTP o2switch (ou smtp.o2switch.net)
        'port'       => 587,                     // 587 (STARTTLS) ou 465 (SSL)
        'encryption' => 'tls',                   // 'tls' pour STARTTLS, 'ssl' pour port 465
        'username'   => 'comptes@lumosphere.org',
        'password'   => '',                      // mot de passe de la boîte comptes@
        'from_email' => 'comptes@lumosphere.org',
        'from_name'  => 'Lumosphère',
        'reply_to'   => 'contact@lumosphere.org',
    ],
```

- [ ] **Step 5 : Créer `api/lib/mailer.php`**

```php
<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;

/**
 * Envoie un email via SMTP (config dans $GLOBALS['app_config']['smtp']).
 * Si SMTP non configuré, logue un avertissement et retourne sans erreur.
 */
function send_mail(
    string $to_email,
    string $to_name,
    string $subject,
    string $html_body,
    string $text_body
): void {
    $smtp = $GLOBALS['app_config']['smtp'] ?? null;
    if (!$smtp || empty($smtp['host']) || empty($smtp['username'])) {
        error_log("send_mail: SMTP non configuré, mail à {$to_email} non envoyé.");
        return;
    }

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $smtp['host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $smtp['username'];
        $mail->Password   = $smtp['password'];
        $mail->SMTPSecure = $smtp['encryption'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int) $smtp['port'];
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom($smtp['from_email'], $smtp['from_name']);
        $mail->addReplyTo($smtp['reply_to'], $smtp['from_name']);
        $mail->addAddress($to_email, $to_name);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $html_body;
        $mail->AltBody = $text_body;

        $mail->send();
    } catch (\Exception $e) {
        error_log("send_mail: échec envoi à {$to_email} — " . $e->getMessage());
        throw new \RuntimeException("L'envoi de l'email a échoué. Veuillez contacter l'administrateur.");
    }
}
```

- [ ] **Step 6 : Créer `api/templates/mail_invite.php`**

```php
<?php
declare(strict_types=1);

/**
 * @return array{subject: string, html: string, text: string}
 */
function mail_template_invite(string $prenom, string $set_url, int $expires_days = 7): array
{
    $subject = 'Bienvenue sur Lumosphère — Définissez votre mot de passe';
    $prenom_h = htmlspecialchars($prenom, ENT_QUOTES, 'UTF-8');
    $url_h    = htmlspecialchars($set_url, ENT_QUOTES, 'UTF-8');

    $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>{$subject}</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <h2 style="color:#2563eb;">Bienvenue sur Lumosphère, {$prenom_h}&nbsp;!</h2>
  <p>Votre compte a été créé. Cliquez sur le lien ci-dessous pour définir votre mot de passe :</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="{$url_h}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
      Définir mon mot de passe
    </a>
  </p>
  <p style="color:#666;font-size:0.9em;">Ce lien est valable {$expires_days} jours. Passé ce délai, demandez un nouvel envoi à l'administrateur.</p>
  <p style="color:#999;font-size:0.8em;">Si vous n'attendiez pas cet email, ignorez-le.</p>
</body>
</html>
HTML;

    $text = "Bienvenue sur Lumosphère, {$prenom} !\n\n"
          . "Définissez votre mot de passe en suivant ce lien :\n{$set_url}\n\n"
          . "Ce lien est valable {$expires_days} jours.\n"
          . "Si vous n'attendiez pas cet email, ignorez-le.";

    return compact('subject', 'html', 'text');
}
```

- [ ] **Step 7 : Créer `api/templates/mail_reset.php`**

```php
<?php
declare(strict_types=1);

/**
 * @return array{subject: string, html: string, text: string}
 */
function mail_template_reset(string $prenom, string $reset_url): array
{
    $subject  = 'Lumosphère — Réinitialisation de votre mot de passe';
    $prenom_h = htmlspecialchars($prenom, ENT_QUOTES, 'UTF-8');
    $url_h    = htmlspecialchars($reset_url, ENT_QUOTES, 'UTF-8');

    $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>{$subject}</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <h2 style="color:#2563eb;">Réinitialisation de mot de passe</h2>
  <p>Bonjour {$prenom_h},</p>
  <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte Lumosphère.</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="{$url_h}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
      Choisir un nouveau mot de passe
    </a>
  </p>
  <p style="color:#666;font-size:0.9em;">Ce lien est valable <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.</p>
</body>
</html>
HTML;

    $text = "Bonjour {$prenom},\n\n"
          . "Une demande de réinitialisation de mot de passe a été effectuée pour votre compte Lumosphère.\n\n"
          . "Choisissez un nouveau mot de passe ici (valable 1 heure) :\n{$reset_url}\n\n"
          . "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.";

    return compact('subject', 'html', 'text');
}
```

- [ ] **Step 8 : Vérifier syntaxe**

```bash
php -l api/lib/mailer.php
php -l api/templates/mail_invite.php
php -l api/templates/mail_reset.php
php -l api/bootstrap.php
```

Attendu : aucune erreur de syntaxe sur chaque fichier.

- [ ] **Step 9 : Commit**

```bash
git add composer.json composer.lock api/bootstrap.php api/lib/mailer.php \
        api/templates/mail_invite.php api/templates/mail_reset.php \
        config/config.php.example vendor/
git commit -m "feat(email): PHPMailer + send_mail() + gabarits invite/reset"
```

Note : `.gitignore` doit exclure `vendor/` (à vérifier et ajouter si absent).

---

## Task 4 : DAL jetons + refactoring `dal_users.php` (Phase 2-3 backend)

**Files :**
- Create : `api/dal/password_tokens.php`
- Modify : `api/dal/users.php` (dal_create_user, dal_update_user, + new dal_resend_invite, dal_find_users)
- Create : `tests/dal/PasswordTokensTest.php`

**Interfaces :**
- Produces :
  - `dal_token_create(PDO $pdo, int $user_id, string $type, int $ttl_seconds, string $ip): string` — retourne le jeton brut (64 hex chars)
  - `dal_token_find_valid(PDO $pdo, string $raw_token): ?array` — retourne `[id, user_id, type]` ou null si invalide/expiré/consommé
  - `dal_token_consume(PDO $pdo, int $token_id): void`
  - `dal_token_revoke_user_tokens(PDO $pdo, int $user_id, string $type): void`
  - `dal_create_user(PDO $pdo, array $ctx, array $data): array` — retourne `dal_ok(['id' => N, 'invite_token' => '...'])` (endpoint envoie l'email)
  - `dal_resend_invite(PDO $pdo, array $ctx, int $user_id): array` — retourne `dal_ok(['invite_token' => '...'])`
  - `dal_find_users` inclut désormais la colonne `is_activated` (boolean)
- Consumes : table `password_tokens`, constante `ROLE_ADMIN` de `api/dal/core.php`

- [ ] **Step 1 : Écrire les tests des jetons**

```php
<?php
// tests/dal/PasswordTokensTest.php
declare(strict_types=1);
namespace Tests\Dal;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../api/dal/core.php';
require_once __DIR__ . '/../../api/dal/password_tokens.php';
require_once __DIR__ . '/TestHelper.php';

class PasswordTokensTest extends TestCase
{
    private \PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = TestHelper::getTestPdo();
        $this->pdo->beginTransaction();
        // Créer un utilisateur de test
        $this->pdo->exec(
            "INSERT INTO users (id, prenom, nom, email, password_hash, role_id)
             VALUES (999, 'Test', 'User', 'token_test@example.com', '!', 3)"
        );
    }

    protected function tearDown(): void { $this->pdo->rollBack(); }

    public function testCreateTokenReturns64HexChars(): void
    {
        $raw = dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $raw);
    }

    public function testCreateTokenStoredAsHash(): void
    {
        $raw = dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        $hash = hash('sha256', $raw);
        $row = $this->pdo->query("SELECT token_hash FROM password_tokens WHERE user_id = 999")->fetch();
        $this->assertSame($hash, $row['token_hash']);
    }

    public function testFindValidTokenReturnsRow(): void
    {
        $raw = dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        $found = dal_token_find_valid($this->pdo, $raw);
        $this->assertNotNull($found);
        $this->assertSame(999, (int) $found['user_id']);
        $this->assertSame('invite', $found['type']);
    }

    public function testFindValidTokenReturnNullIfExpired(): void
    {
        $raw = dal_token_create($this->pdo, 999, 'reset', 1, '127.0.0.1');
        // Forcer l'expiration
        $this->pdo->exec("UPDATE password_tokens SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE user_id = 999");
        $this->assertNull(dal_token_find_valid($this->pdo, $raw));
    }

    public function testConsumedTokenIsInvalid(): void
    {
        $raw = dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        $found = dal_token_find_valid($this->pdo, $raw);
        dal_token_consume($this->pdo, (int) $found['id']);
        $this->assertNull(dal_token_find_valid($this->pdo, $raw));
    }

    public function testRevokeRemovesExistingTokens(): void
    {
        dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        dal_token_revoke_user_tokens($this->pdo, 999, 'invite');
        $count = $this->pdo->query("SELECT COUNT(*) FROM password_tokens WHERE user_id = 999 AND used_at IS NULL")->fetchColumn();
        $this->assertSame(0, (int) $count);
    }
}
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
vendor/bin/phpunit tests/dal/PasswordTokensTest.php
```

Attendu : FAIL — `dal_token_create` non définie.

- [ ] **Step 3 : Implémenter `api/dal/password_tokens.php`**

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/core.php';

/**
 * Crée un jeton sécurisé. Retourne le jeton brut (à envoyer par mail uniquement).
 *
 * @param int    $ttl_seconds Durée de validité en secondes (invite: 604800 = 7j, reset: 3600 = 1h)
 */
function dal_token_create(PDO $pdo, int $user_id, string $type, int $ttl_seconds, string $ip): string
{
    $raw_token = bin2hex(random_bytes(32)); // 64 hex chars
    $hash      = hash('sha256', $raw_token);
    $expires   = date('Y-m-d H:i:s', time() + $ttl_seconds);

    $stmt = $pdo->prepare(
        'INSERT INTO password_tokens (user_id, token_hash, type, expires_at, created_ip)
         VALUES (:user_id, :token_hash, :type, :expires_at, :ip)'
    );
    $stmt->execute([
        'user_id'    => $user_id,
        'token_hash' => $hash,
        'type'       => $type,
        'expires_at' => $expires,
        'ip'         => $ip,
    ]);

    return $raw_token;
}

/**
 * Trouve un jeton valide (non consommé, non expiré). Retourne null si invalide.
 *
 * @return array{id: int, user_id: int, type: string}|null
 */
function dal_token_find_valid(PDO $pdo, string $raw_token): ?array
{
    $hash = hash('sha256', $raw_token);
    $stmt = $pdo->prepare(
        'SELECT id, user_id, type FROM password_tokens
         WHERE token_hash = :hash AND used_at IS NULL AND expires_at > NOW()
         LIMIT 1'
    );
    $stmt->execute(['hash' => $hash]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Marque un jeton comme consommé (usage unique).
 */
function dal_token_consume(PDO $pdo, int $token_id): void
{
    $pdo->prepare('UPDATE password_tokens SET used_at = NOW() WHERE id = :id')
        ->execute(['id' => $token_id]);
}

/**
 * Révoque (marque comme utilisés) tous les jetons non consommés d'un type pour un utilisateur.
 * Appelé avant d'émettre un nouveau jeton pour éviter les doublons actifs.
 */
function dal_token_revoke_user_tokens(PDO $pdo, int $user_id, string $type): void
{
    $pdo->prepare(
        'UPDATE password_tokens SET used_at = NOW()
         WHERE user_id = :user_id AND type = :type AND used_at IS NULL'
    )->execute(['user_id' => $user_id, 'type' => $type]);
}
```

- [ ] **Step 4 : Vérifier que les tests des jetons passent**

```bash
vendor/bin/phpunit tests/dal/PasswordTokensTest.php
```

Attendu : OK.

- [ ] **Step 5 : Refactoriser `api/dal/users.php`**

Ajouter en haut du fichier :
```php
require_once __DIR__ . '/password_tokens.php';
```

**Remplacer `dal_create_user`** (supprimer tout le bloc existant et remplacer par) :

```php
function dal_create_user(PDO $pdo, array $ctx, array $data): array
{
    dal_require_permission($ctx, 'admin.users');
    $email = trim($data['email'] ?? '');
    if ($email === '') {
        return dal_error('L\'email est requis.');
    }
    if (empty($data['role_id'])) {
        return dal_error('Le rôle est requis.');
    }

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO users (prenom, nom, email, password_hash, role_id)
             VALUES (:prenom, :nom, :email, :password_hash, :role_id)'
        );
        $stmt->execute([
            'prenom'        => trim($data['prenom'] ?? ''),
            'nom'           => trim($data['nom']    ?? ''),
            'email'         => $email,
            'password_hash' => '!', // placeholder : compte non activé (password_set_at IS NULL)
            'role_id'       => (int) $data['role_id'],
        ]);
        $user_id = (int) $pdo->lastInsertId();

        // Révoquer tout ancien jeton d'invitation et créer le nouveau
        dal_token_revoke_user_tokens($pdo, $user_id, 'invite');
        $ip    = $_SERVER['REMOTE_ADDR'] ?? '';
        $token = dal_token_create($pdo, $user_id, 'invite', 7 * 24 * 3600, $ip);

        return dal_ok(['id' => $user_id, 'invite_token' => $token]);
    } catch (\PDOException $e) {
        if ($e->getCode() === '23000') {
            return dal_error('Un utilisateur avec cet email existe déjà.');
        }
        throw $e;
    }
}
```

**Modifier `dal_update_user`** — supprimer le bloc password (lignes 100-106 dans le fichier original) :

Supprimer :
```php
    if (isset($data['password']) && $data['password'] !== '') {
        if (mb_strlen($data['password']) < 8) {
            return dal_error('Le mot de passe doit contenir au moins 8 caractères.');
        }
        $fields[] = 'password_hash = :password_hash';
        $params['password_hash'] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]);
    }
```

**Modifier `dal_get_user_for_auth`** pour inclure `password_set_at` :

```php
function dal_get_user_for_auth(PDO $pdo, string $email): ?array
{
    $stmt = $pdo->prepare(
        'SELECT id, prenom, nom, email, password_hash, role_id, password_set_at
         FROM users WHERE email = :email'
    );
    $stmt->execute(['email' => $email]);
    return $stmt->fetch() ?: null;
}
```

**Modifier `dal_find_users`** pour inclure le statut d'activation :

```php
function dal_find_users(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'admin.users');
    $rows = $pdo->query(
        'SELECT u.id, u.prenom, u.nom, u.email, u.role_id, r.nom AS role_nom,
                u.created_at, u.updated_at,
                (u.password_set_at IS NOT NULL) AS is_activated
         FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.nom, u.prenom'
    )->fetchAll();
    return dal_ok($rows);
}
```

**Ajouter `dal_resend_invite`** à la fin de `api/dal/users.php` :

```php
function dal_resend_invite(PDO $pdo, array $ctx, int $user_id): array
{
    dal_require_permission($ctx, 'admin.users');
    $stmt = $pdo->prepare('SELECT id, prenom, nom, email, password_set_at FROM users WHERE id = :id');
    $stmt->execute(['id' => $user_id]);
    $user = $stmt->fetch();
    if (!$user) {
        return dal_error('Utilisateur introuvable.');
    }
    if ($user['password_set_at'] !== null) {
        return dal_error('Ce compte est déjà activé. Utilisez la réinitialisation de mot de passe.');
    }

    dal_token_revoke_user_tokens($pdo, $user_id, 'invite');
    $ip    = $_SERVER['REMOTE_ADDR'] ?? '';
    $token = dal_token_create($pdo, $user_id, 'invite', 7 * 24 * 3600, $ip);

    return dal_ok(['invite_token' => $token, 'user' => $user]);
}
```

- [ ] **Step 6 : Vérifier syntaxe + tests existants**

```bash
php -l api/dal/users.php
php -l api/dal/password_tokens.php
vendor/bin/phpunit tests/dal/PasswordTokensTest.php tests/dal/AuthTest.php
```

Attendu : tous les tests passent.

Note : les tests de `UsersTest.php` existants vont casser car `dal_create_user` ne reçoit plus de mot de passe. C'est intentionnel — la Task 5 met à jour les tests utilisateurs.

- [ ] **Step 7 : Mettre à jour `tests/dal/UsersTest.php`**

Dans tous les appels à `dal_create_user`, supprimer le champ `password` et vérifier que `invite_token` est retourné à la place. Exemple :

```php
// Avant
$result = dal_create_user($this->pdo, $ctx, [
    'prenom' => 'Test', 'nom' => 'User',
    'email' => 'test@example.com', 'role_id' => ROLE_EDITEUR,
    'password' => 'TestPassword123!',
]);

// Après
$result = dal_create_user($this->pdo, $ctx, [
    'prenom' => 'Test', 'nom' => 'User',
    'email' => 'test@example.com', 'role_id' => ROLE_EDITEUR,
]);
$this->assertSame('ok', $result['status']);
$this->assertArrayHasKey('invite_token', $result['data']);
$this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $result['data']['invite_token']);
```

- [ ] **Step 8 : Vérifier tous les tests DAL**

```bash
vendor/bin/phpunit tests/dal/
```

Attendu : tous les tests passent.

- [ ] **Step 9 : Commit**

```bash
git add api/dal/password_tokens.php api/dal/users.php tests/dal/PasswordTokensTest.php tests/dal/UsersTest.php
git commit -m "feat(auth): DAL jetons + dal_create_user sans password + dal_resend_invite"
```

---

## Task 5 : Endpoints PHP — set-password, token-info, forgot-password, resend-invite + blocage login (Phase 3-4 backend)

**Files :**
- Modify : `api/endpoints/auth.php`
- Modify : `api/endpoints/users.php`
- Modify : `api/dal/auth.php` (fonction `_auth_login`)

**Interfaces :**
- Produces :
  - `GET /api/auth/token-info?token=<raw>` → `{ role_id, type, valid: true }` ou erreur 400
  - `POST /api/auth/set-password` → `{ token, password }` → OK ou erreur
  - `POST /api/auth/forgot-password` → `{ email }` → toujours OK (neutre)
  - `POST /api/users/:id/resend-invite` → OK ou erreur
- Consumes : `dal_token_find_valid()`, `dal_token_consume()`, `dal_token_revoke_user_tokens()`, `dal_password_validate()`, `send_mail()`, gabarits `mail_invite` et `mail_reset`, `dal_resend_invite()`, `_dal_auth_rl_check()` / `_dal_auth_rl_record()`

- [ ] **Step 1 : Modifier `api/endpoints/auth.php` — ajouter `require_once` et les nouvelles routes**

En haut du fichier, ajouter les require manquants :
```php
require_once dirname(__DIR__) . '/dal/password_tokens.php';
require_once dirname(__DIR__) . '/dal/password_policy.php';
require_once dirname(__DIR__) . '/lib/mailer.php';
require_once dirname(__DIR__) . '/templates/mail_invite.php';
require_once dirname(__DIR__) . '/templates/mail_reset.php';
```

Dans `endpoint_auth()`, ajouter dans le `match` (avant `default =>`) :
```php
        $method === 'GET'  && $action === 'token-info'      => _auth_token_info($pdo, $_GET['token'] ?? ''),
        $method === 'POST' && $action === 'set-password'    => _auth_set_password($pdo, $body ?? []),
        $method === 'POST' && $action === 'forgot-password' => _auth_forgot_password($pdo, $body ?? []),
```

- [ ] **Step 2 : Implémenter `_auth_token_info` dans `api/endpoints/auth.php`**

```php
function _auth_token_info(PDO $pdo, string $raw_token): array
{
    if ($raw_token === '') {
        return dal_error('Jeton manquant.');
    }
    $token = dal_token_find_valid($pdo, $raw_token);
    if ($token === null) {
        return dal_error('Ce lien est invalide ou a expiré.');
    }
    // Charger le rôle de l'utilisateur pour que le frontend adapte la jauge
    $stmt = $pdo->prepare('SELECT role_id FROM users WHERE id = :id');
    $stmt->execute(['id' => $token['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        return dal_error('Utilisateur introuvable.');
    }
    return dal_ok(['role_id' => (int) $user['role_id'], 'type' => $token['type']]);
}
```

- [ ] **Step 3 : Implémenter `_auth_set_password` dans `api/endpoints/auth.php`**

```php
function _auth_set_password(PDO $pdo, array $body): array
{
    $raw_token = trim($body['token'] ?? '');
    $password  = $body['password'] ?? '';

    if ($raw_token === '') {
        return dal_error('Jeton manquant.');
    }

    $token = dal_token_find_valid($pdo, $raw_token);
    if ($token === null) {
        return dal_error('Ce lien est invalide ou a expiré. Demandez un nouvel envoi.');
    }

    $stmt = $pdo->prepare('SELECT id, prenom, nom, email, role_id FROM users WHERE id = :id');
    $stmt->execute(['id' => $token['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        return dal_error('Utilisateur introuvable.');
    }

    // Valider la force du mot de passe
    $errors = dal_password_validate(
        $password,
        (int) $user['role_id'],
        $user['email'],
        $user['prenom'],
        $user['nom']
    );
    if (!empty($errors)) {
        return dal_error($errors[0]);
    }

    // Appliquer le nouveau mot de passe et activer le compte
    $pdo->prepare(
        'UPDATE users SET password_hash = :hash, password_set_at = NOW() WHERE id = :id'
    )->execute([
        'hash' => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
        'id'   => $user['id'],
    ]);

    // Consommer le jeton (usage unique)
    dal_token_consume($pdo, (int) $token['id']);

    return dal_ok(['message' => 'Mot de passe défini avec succès. Vous pouvez maintenant vous connecter.']);
}
```

- [ ] **Step 4 : Implémenter `_auth_forgot_password` dans `api/endpoints/auth.php`**

```php
const PASSWORD_RESET_MAX_ATTEMPTS = 3;
const PASSWORD_RESET_LOCKOUT      = 3600; // 1 heure

function _auth_forgot_password(PDO $pdo, array $body): array
{
    $email = trim($body['email'] ?? '');
    // Réponse toujours identique (anti-énumération)
    $neutral_response = dal_ok(['message' => "Si un compte existe pour cette adresse, un email vient d'être envoyé."]);

    if ($email === '') {
        return $neutral_response;
    }

    // Rate-limiting par email (réutilise l'infrastructure existante)
    $rl = _dal_auth_rl_check($pdo, 'password_reset_attempts', 'email', $email);
    if ($rl['locked']) {
        return $neutral_response; // Silencieux pour ne pas aider l'attaquant
    }

    $stmt = $pdo->prepare('SELECT id, prenom, nom, email, role_id, password_set_at FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || $user['password_set_at'] === null) {
        // Compte inexistant ou non activé : ne rien faire, réponse neutre
        return $neutral_response;
    }

    _dal_auth_rl_record($pdo, 'password_reset_attempts', 'email', $email);

    // Révoquer les anciens jetons de reset et créer le nouveau
    dal_token_revoke_user_tokens($pdo, (int) $user['id'], 'reset');
    $ip    = $_SERVER['REMOTE_ADDR'] ?? '';
    $token = dal_token_create($pdo, (int) $user['id'], 'reset', 3600, $ip);

    $origin  = $GLOBALS['app_config']['allowed_origin'] ?? '';
    $reset_url = "{$origin}/mot-de-passe-oublie?token={$token}";

    $tpl = mail_template_reset($user['prenom'], $reset_url);
    send_mail($user['email'], "{$user['prenom']} {$user['nom']}", $tpl['subject'], $tpl['html'], $tpl['text']);

    return $neutral_response;
}
```

- [ ] **Step 5 : Modifier `_auth_login` dans `api/endpoints/auth.php` — bloquer les comptes non activés**

Après la vérification du mot de passe (ligne `if (!$user || !password_verify($password, $hash))`), et après le `dal_auth_clear_attempts` (connexion réussie), ajouter la vérification d'activation :

```php
    // Connexion réussie — vérifier que le compte est activé
    if ($user['password_set_at'] === null) {
        return dal_error("Votre compte n'est pas encore activé. Vérifiez vos emails pour définir votre mot de passe.");
    }
```

Ce bloc s'insère juste avant `$remember = !empty($body['remember']);`.

- [ ] **Step 6 : Modifier `api/endpoints/users.php` — ajouter resend-invite**

Ajouter `require_once dirname(__DIR__) . '/dal/users.php';` (si absent) et require mailer/templates. Dans `endpoint_users()`, ajouter dans le match :

```php
        $method === 'POST' && $action === 'resend-invite' && $id !== null
            => _users_resend_invite($pdo, $ctx, $id),
```

Puis implémenter la fonction :

```php
function _users_resend_invite(PDO $pdo, array $ctx, int $user_id): array
{
    require_once dirname(__DIR__) . '/lib/mailer.php';
    require_once dirname(__DIR__) . '/templates/mail_invite.php';

    $result = dal_resend_invite($pdo, $ctx, $user_id);
    if ($result['status'] !== 'ok') {
        return $result;
    }

    $user  = $result['data']['user'];
    $token = $result['data']['invite_token'];

    $origin  = $GLOBALS['app_config']['allowed_origin'] ?? '';
    $set_url = "{$origin}/definir-mot-de-passe?token={$token}";
    $tpl     = mail_template_invite($user['prenom'], $set_url);

    send_mail($user['email'], "{$user['prenom']} {$user['nom']}", $tpl['subject'], $tpl['html'], $tpl['text']);

    return dal_ok(['message' => 'Invitation renvoyée.']);
}
```

Modifier aussi la création d'utilisateur dans `endpoint_users()` pour envoyer le mail d'invitation :

```php
function _users_create(PDO $pdo, array $ctx, array $body): array
{
    require_once dirname(__DIR__) . '/lib/mailer.php';
    require_once dirname(__DIR__) . '/templates/mail_invite.php';

    $result = dal_create_user($pdo, $ctx, $body);
    if ($result['status'] !== 'ok') {
        return $result;
    }

    // Envoyer l'email d'invitation
    $user_id = $result['data']['id'];
    $token   = $result['data']['invite_token'];

    $stmt = $pdo->prepare('SELECT prenom, nom, email FROM users WHERE id = :id');
    $stmt->execute(['id' => $user_id]);
    $user = $stmt->fetch();

    $origin  = $GLOBALS['app_config']['allowed_origin'] ?? '';
    $set_url = "{$origin}/definir-mot-de-passe?token={$token}";
    $tpl     = mail_template_invite($user['prenom'], $set_url);

    send_mail($user['email'], "{$user['prenom']} {$user['nom']}", $tpl['subject'], $tpl['html'], $tpl['text']);

    return dal_ok(['id' => $user_id]);
}
```

Et dans `endpoint_users()`, router `POST` sans id vers `_users_create` :
```php
        $method === 'POST' && $id === null  => _users_create($pdo, $ctx, $body ?? []),
```

- [ ] **Step 7 : Vérifier syntaxe PHP**

```bash
php -l api/endpoints/auth.php
php -l api/endpoints/users.php
```

Attendu : pas d'erreur.

- [ ] **Step 8 : Test manuel des endpoints (avec curl)**

```bash
# Test token-info avec token invalide
curl -s http://localhost:8080/api/auth/token-info?token=invalid | python3 -m json.tool
# Attendu : {"status":"error","data":null,"errors":["Ce lien est invalide..."]}

# Test forgot-password
curl -s -X POST http://localhost:8080/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@nowhere.com"}' | python3 -m json.tool
# Attendu : {"status":"ok","data":{"message":"Si un compte existe..."},"errors":[]}
```

- [ ] **Step 9 : Commit**

```bash
git add api/endpoints/auth.php api/endpoints/users.php api/dal/auth.php
git commit -m "feat(auth): endpoints set-password, token-info, forgot-password, resend-invite"
```

---

## Task 6 : Frontend — PasswordStrengthMeter + hook (Phase 1 UI)

**Files :**
- Create : `src/hooks/usePasswordStrength.ts`
- Create : `src/features/auth/PasswordStrengthMeter.tsx`

**Interfaces :**
- Produces :
  - `usePasswordStrength(password: string): 'weak' | 'medium' | 'strong'`
  - `<PasswordStrengthMeter password={string} />` (s'affiche vide si `!password`)
- Consumes : `@zxcvbn-ts/core` (lazy import)

- [ ] **Step 1 : Installer zxcvbn-ts**

```bash
pnpm add @zxcvbn-ts/core
```

Attendu : `@zxcvbn-ts/core` apparaît dans `package.json`.

- [ ] **Step 2 : Créer `src/hooks/usePasswordStrength.ts`**

```ts
import { useState, useEffect } from 'react'

export type StrengthLevel = 'weak' | 'medium' | 'strong'

export function usePasswordStrength(password: string): StrengthLevel {
  const [score, setScore] = useState<number>(0)

  useEffect(() => {
    if (!password) {
      setScore(0)
      return
    }
    let cancelled = false
    void import('@zxcvbn-ts/core').then(({ zxcvbn }) => {
      if (!cancelled) {
        const result = zxcvbn(password)
        setScore(result.score)
      }
    })
    return () => {
      cancelled = true
    }
  }, [password])

  if (score <= 1) return 'weak'
  if (score === 2) return 'medium'
  return 'strong'
}
```

- [ ] **Step 3 : Écrire les tests Vitest pour le hook**

```ts
// src/hooks/__tests__/usePasswordStrength.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePasswordStrength } from '../usePasswordStrength'

// Mock zxcvbn-ts pour contrôler les scores
vi.mock('@zxcvbn-ts/core', () => ({
  zxcvbn: (pwd: string) => {
    if (pwd === 'weak')   return { score: 1 }
    if (pwd === 'medium') return { score: 2 }
    return { score: 4 }
  },
}))

describe('usePasswordStrength', () => {
  it('returns "weak" for empty password', () => {
    const { result } = renderHook(() => usePasswordStrength(''))
    expect(result.current).toBe('weak')
  })

  it('returns "weak" for score ≤ 1', async () => {
    const { result } = renderHook(() => usePasswordStrength('weak'))
    await waitFor(() => expect(result.current).toBe('weak'))
  })

  it('returns "medium" for score 2', async () => {
    const { result } = renderHook(() => usePasswordStrength('medium'))
    await waitFor(() => expect(result.current).toBe('medium'))
  })

  it('returns "strong" for score ≥ 3', async () => {
    const { result } = renderHook(() => usePasswordStrength('AStrongPassphrase!99'))
    await waitFor(() => expect(result.current).toBe('strong'))
  })
})
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
pnpm test src/hooks/__tests__/usePasswordStrength.test.ts
```

Attendu : 4 tests passent.

- [ ] **Step 5 : Créer `src/features/auth/PasswordStrengthMeter.tsx`**

```tsx
import { usePasswordStrength, type StrengthLevel } from '@/hooks/usePasswordStrength'

const config: Record<StrengthLevel, { label: string; barClass: string; width: string }> = {
  weak:   { label: 'Faible', barClass: 'bg-red-500',    width: 'w-1/3' },
  medium: { label: 'Moyen',  barClass: 'bg-orange-400', width: 'w-2/3' },
  strong: { label: 'Fort',   barClass: 'bg-green-500',  width: 'w-full' },
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const level = usePasswordStrength(password)

  if (!password) return null

  const { label, barClass, width } = config[level]

  return (
    <div className="mt-1" role="status" aria-live="polite" aria-label={`Force du mot de passe : ${label}`}>
      <div className="h-1.5 rounded-full bg-(--color-border)">
        <div className={`h-full rounded-full transition-all duration-300 ${barClass} ${width}`} />
      </div>
      <p className="mt-0.5 text-xs text-(--color-text-secondary)">{label}</p>
    </div>
  )
}
```

- [ ] **Step 6 : Vérifier TypeScript + lint + build**

```bash
pnpm tsc --noEmit
pnpm lint
pnpm build
```

Attendu : pas d'erreur.

- [ ] **Step 7 : Commit**

```bash
git add src/hooks/usePasswordStrength.ts src/features/auth/PasswordStrengthMeter.tsx \
        src/hooks/__tests__/usePasswordStrength.test.ts package.json pnpm-lock.yaml
git commit -m "feat(ui): hook usePasswordStrength + composant PasswordStrengthMeter"
```

---

## Task 7 : Frontend — SetPasswordPage + routes + api.ts (Phase 3-4 UI)

**Files :**
- Create : `src/features/auth/SetPasswordPage.tsx`
- Modify : `src/services/api.ts`
- Modify : `src/App.tsx`

**Interfaces :**
- Produces :
  - Route `/definir-mot-de-passe?token=<raw>` → affiche la page de définition du mot de passe
  - Route `/mot-de-passe-oublie?token=<raw>` → même page (type `reset`)
  - `apiClient.tokenInfo(token: string)` → `{ role_id: number, type: 'invite' | 'reset' }`
  - `apiClient.setPassword(token: string, password: string)` → void
- Consumes : `PasswordStrengthMeter`, `usePasswordStrength`, `apiClient`

- [ ] **Step 1 : Ajouter les méthodes API dans `src/services/api.ts`**

Ajouter dans l'objet `apiClient` exporté, après `forceLogout` :

```ts
  // Gestion des mots de passe (endpoints publics)
  tokenInfo: (token: string) =>
    get<{ role_id: number; type: 'invite' | 'reset' }>(`auth/token-info?token=${encodeURIComponent(token)}`),
  setPassword: (token: string, password: string) =>
    post<{ message: string }>('auth/set-password', { token, password }),
  forgotPassword: (email: string) =>
    post<{ message: string }>('auth/forgot-password', { email }),
  resendInvite: (userId: number) =>
    post<{ message: string }>(`users/${userId}/resend-invite`, {}),
```

Mettre à jour aussi `findUsers` pour typer le retour :
```ts
  findUsers: () =>
    get<{ id: number; prenom: string; nom: string; email: string; role_id: number; role_nom: string; is_activated: boolean }[]>('users'),
```

- [ ] **Step 2 : Créer `src/features/auth/SetPasswordPage.tsx`**

```tsx
import { useState, useEffect, type FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { ROLE_ADMIN, ROLE_EDITEUR } from '@/constants/roles'
import { apiClient } from '@/services/api'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { usePasswordStrength } from '@/hooks/usePasswordStrength'

export function SetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [roleId, setRoleId]         = useState<number | null>(null)
  const [tokenType, setTokenType]   = useState<'invite' | 'reset' | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const strength = usePasswordStrength(password)
  const isPrivileged = roleId === ROLE_ADMIN || roleId === ROLE_EDITEUR
  const isStrong = strength === 'strong'
  const canSubmit = !submitting && password.length > 0 && (!isPrivileged || isStrong)

  useEffect(() => {
    if (!token) { setTokenError('Lien invalide.'); return }
    apiClient.tokenInfo(token).then((res) => {
      if (res.status === 'ok' && res.data) {
        setRoleId(res.data.role_id)
        setTokenType(res.data.type)
      } else {
        setTokenError(res.errors?.[0] ?? 'Ce lien est invalide ou a expiré.')
      }
    })
  }, [token])

  const title = tokenType === 'reset' ? 'Nouveau mot de passe' : 'Définir mon mot de passe'
  const minLength = isPrivileged ? 12 : 8

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < minLength) {
      setError(`Le mot de passe doit faire au moins ${minLength} caractères.`)
      return
    }
    if (isPrivileged && !isStrong) {
      setError("Le mot de passe doit atteindre le niveau « Fort ».")
      return
    }
    if (password !== confirm) {
      setError('La confirmation ne correspond pas.')
      return
    }
    setSubmitting(true)
    const res = await apiClient.setPassword(token, password)
    setSubmitting(false)
    if (res.status === 'ok') {
      setSuccess(true)
    } else {
      setError(res.errors?.[0] ?? 'Une erreur est survenue.')
    }
  }

  if (tokenError) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6 text-center">
        <p className="text-sm text-(--color-danger-text)">{tokenError}</p>
        <p className="mt-2 text-sm text-(--color-text-secondary)">
          Demandez un nouvel envoi à l'administrateur ou utilisez <a href="/mot-de-passe-oublie" className="text-(--color-action) underline">Mot de passe oublié</a>.
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6 text-center">
        <p className="mb-4 text-sm text-(--color-text-primary)">Mot de passe défini avec succès !</p>
        <button
          onClick={() => navigate('/login')}
          className="rounded-md bg-(--color-action) px-4 py-2 text-sm text-(--color-action-text)"
        >
          Se connecter
        </button>
      </div>
    )
  }

  if (roleId === null) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6">
        <p className="text-sm text-(--color-text-secondary)">Vérification du lien…</p>
      </div>
    )
  }

  const fieldClass = 'w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary)'

  return (
    <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6">
      <h1 className="mb-4 text-xl font-bold text-(--color-text-primary)">{title}</h1>

      {error && (
        <div className="mb-4 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="sp-password" className="text-sm text-(--color-text-secondary)">
            {isPrivileged ? 'Mot de passe (niveau Fort requis)' : `Mot de passe (au moins ${minLength} caractères)`}
          </label>
          <div className="relative">
            <input
              id="sp-password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${fieldClass} pr-10`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? 'Masquer' : 'Afficher'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-(--color-text-placeholder)"
            >
              {showPwd ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {isPrivileged && <PasswordStrengthMeter password={password} />}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sp-confirm" className="text-sm text-(--color-text-secondary)">Confirmation</label>
          <input
            id="sp-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={fieldClass}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-(--color-action) px-4 py-2 text-sm font-medium text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-60"
        >
          {submitting ? 'Enregistrement…' : 'Définir mon mot de passe'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3 : Ajouter les routes dans `src/App.tsx`**

Ajouter l'import :
```ts
import { SetPasswordPage } from '@/features/auth/SetPasswordPage'
```

Dans le bloc `<Route element={<AuthLayout />}>`, ajouter :
```tsx
        <Route path="definir-mot-de-passe" element={<SetPasswordPage />} />
        <Route path="mot-de-passe-oublie"  element={<SetPasswordPage />} />
```

(Les deux routes utilisent `SetPasswordPage` — la distinction `invite` vs `reset` est gérée par le composant via `token-info`.)

- [ ] **Step 4 : Vérifier TypeScript + build**

```bash
pnpm tsc --noEmit
pnpm lint
pnpm build
```

Attendu : aucune erreur.

- [ ] **Step 5 : Test visuel**

Démarrer le frontend (`pnpm dev`) et ouvrir `/definir-mot-de-passe` sans token.
Attendu : message « Lien invalide. »

- [ ] **Step 6 : Commit**

```bash
git add src/features/auth/SetPasswordPage.tsx src/services/api.ts src/App.tsx
git commit -m "feat(ui): SetPasswordPage — définir/réinitialiser mot de passe via lien"
```

---

## Task 8 : Frontend — ForgotPasswordPage + lien dans LoginPage (Phase 4 UI)

**Files :**
- Create : `src/features/auth/ForgotPasswordPage.tsx`
- Modify : `src/features/auth/LoginPage.tsx`
- Modify : `src/App.tsx`

**Interfaces :**
- Produces : route `/mot-de-passe-oublie` sans token → formulaire de demande ; `LoginPage` avec lien « Mot de passe oublié ? »
- Consumes : `apiClient.forgotPassword()`

- [ ] **Step 1 : Créer `src/features/auth/ForgotPasswordPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { apiClient } from '@/services/api'
import { useSearchParams } from 'react-router'

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  // Si un token est présent dans l'URL, cette route est gérée par SetPasswordPage.
  // Ce composant ne gère que le formulaire de demande (sans token).
  if (token) return null

  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.includes('@')) {
      setError('Adresse email invalide.')
      return
    }
    setSubmitting(true)
    const res = await apiClient.forgotPassword(email)
    setSubmitting(false)
    if (res.status === 'ok') {
      setSent(true)
    } else {
      setError(res.errors?.[0] ?? 'Une erreur est survenue.')
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6">
        <h1 className="mb-4 text-xl font-bold text-(--color-text-primary)">Email envoyé</h1>
        <p className="text-sm text-(--color-text-secondary)">
          Si un compte existe pour cette adresse, un email vient d'être envoyé avec un lien valable 1 heure.
        </p>
        <Link to="/login" className="mt-4 block text-center text-sm text-(--color-action) hover:underline">
          Retour à la connexion
        </Link>
      </div>
    )
  }

  const fieldClass = 'w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary)'

  return (
    <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6">
      <h1 className="mb-4 text-xl font-bold text-(--color-text-primary)">Mot de passe oublié</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Saisissez votre adresse email. Vous recevrez un lien pour choisir un nouveau mot de passe.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="fp-email" className="text-sm text-(--color-text-secondary)">Email</label>
          <input
            id="fp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            autoComplete="email"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || email === ''}
          className="rounded-md bg-(--color-action) px-4 py-2 text-sm font-medium text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-60"
        >
          {submitting ? 'Envoi…' : 'Envoyer le lien'}
        </button>

        <Link to="/login" className="text-center text-sm text-(--color-text-secondary) hover:underline">
          Retour à la connexion
        </Link>
      </form>
    </div>
  )
}
```

- [ ] **Step 2 : Modifier `src/App.tsx`**

Ajouter l'import :
```ts
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
```

Remplacer la route `mot-de-passe-oublie` (actuellement pointant vers `SetPasswordPage`) :
```tsx
        <Route path="mot-de-passe-oublie" element={<ForgotPasswordPage />} />
```

Et garder `SetPasswordPage` uniquement pour `definir-mot-de-passe` et pour les liens reset (le composant `ForgotPasswordPage` redirige vers `SetPasswordPage` quand un token est présent dans l'URL — mais en pratique le lien reset pointe vers `/definir-mot-de-passe?token=...` donc les routes sont distinctes). Corriger le `_auth_forgot_password` en Task 5 : la `reset_url` pointe vers `/definir-mot-de-passe?token=...` (pas `/mot-de-passe-oublie`).

- [ ] **Step 3 : Ajouter le lien dans `src/features/auth/LoginPage.tsx`**

Après le champ mot de passe (avant le bouton submit), ajouter :
```tsx
        <div className="text-right">
          <Link to="/mot-de-passe-oublie" className="text-sm text-(--color-action) hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
```

Ajouter l'import `Link` depuis `react-router` en haut du fichier.

- [ ] **Step 4 : Vérifier TypeScript + build**

```bash
pnpm tsc --noEmit && pnpm lint && pnpm build
```

Attendu : aucune erreur.

- [ ] **Step 5 : Test visuel**

- Ouvrir `/login` → lien « Mot de passe oublié ? » visible.
- Cliquer → formulaire `/mot-de-passe-oublie` s'affiche.
- Soumettre n'importe quel email → message neutre « Si un compte existe… ».

- [ ] **Step 6 : Commit**

```bash
git add src/features/auth/ForgotPasswordPage.tsx src/features/auth/LoginPage.tsx src/App.tsx
git commit -m "feat(ui): ForgotPasswordPage + lien Mot de passe oublié dans LoginPage"
```

---

## Task 9 : Frontend — refactoring UserFormModal + statut dans UsersPage (Phase 3 admin UI)

**Files :**
- Modify : `src/features/admin/UserFormModal.tsx`
- Modify : `src/features/admin/UsersPage.tsx` (si elle affiche une liste tabulaire des utilisateurs)

**Interfaces :**
- Produces : formulaire de création sans champ password, badge statut (« En attente » / « Actif »), bouton « Renvoyer l'invitation » pour comptes non activés
- Consumes : `apiClient.resendInvite(userId)`, type `UserRow` avec `is_activated`

- [ ] **Step 1 : Réécrire `src/features/admin/UserFormModal.tsx`**

```tsx
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { z } from 'zod'
import { apiClient } from '@/services/api'

type Role = { id: number; nom: string }
type UserRow = {
  id: number; prenom: string; nom: string; email: string;
  role_id: number; is_activated: boolean
}

const schema = z.object({
  prenom:  z.string().min(1, 'Le prénom est requis.'),
  nom:     z.string().min(1, 'Le nom est requis.'),
  email:   z.string().email('Email invalide.'),
  role_id: z.number().int().positive('Rôle requis.'),
})

export function UserFormModal({
  open, user, roles, onClose, onSaved,
}: {
  open: boolean; user: UserRow | null; roles: Role[];
  onClose: () => void; onSaved: () => void
}) {
  const [prenom,  setPrenom]  = useState(user?.prenom  ?? '')
  const [nom,     setNom]     = useState(user?.nom     ?? '')
  const [email,   setEmail]   = useState(user?.email   ?? '')
  const [roleId,  setRoleId]  = useState<number>(user?.role_id ?? roles[0]?.id ?? 0)
  const [error,   setError]   = useState<string | null>(null)
  const [resent,  setResent]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const parsed = schema.safeParse({ prenom, nom, email, role_id: roleId })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Saisie invalide.')
      return
    }
    const payload = { prenom, nom, email, role_id: roleId }
    const res = user
      ? await apiClient.updateUser(user.id, payload)
      : await apiClient.createUser(payload)
    if (res.status === 'ok') {
      onSaved()
    } else {
      setError(res.errors?.[0] ?? "Erreur lors de l'enregistrement.")
    }
  }

  async function handleResendInvite() {
    if (!user) return
    setError(null)
    const res = await apiClient.resendInvite(user.id)
    if (res.status === 'ok') {
      setResent(true)
    } else {
      setError(res.errors?.[0] ?? "Erreur lors de l'envoi.")
    }
  }

  const fieldClass  = 'w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm'
  const labelClass  = 'mb-1 block text-sm text-(--color-text-secondary)'
  const isEditing   = user !== null
  const isPending   = user !== null && !user.is_activated

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 w-[min(90vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-(--color-bg-card) p-5 shadow-lg"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <Dialog.Title className="mb-4 text-lg font-bold text-(--color-text-primary)">
            {isEditing ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'}
          </Dialog.Title>

          {/* Badge statut (mode édition seulement) */}
          {isEditing && (
            <div className="mb-4 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isPending ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {isPending ? 'En attente' : 'Actif'}
              </span>
              {isPending && !resent && (
                <button
                  type="button"
                  onClick={handleResendInvite}
                  className="text-xs text-(--color-action) hover:underline"
                >
                  Renvoyer l'invitation
                </button>
              )}
              {resent && (
                <span className="text-xs text-green-600">Invitation envoyée !</span>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className={labelClass} htmlFor="f-prenom">Prénom</label>
              <input id="f-prenom" className={fieldClass} value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="f-nom">Nom</label>
              <input id="f-nom" className={fieldClass} value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="f-email">Email</label>
              <input id="f-email" type="email" className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="f-role">Rôle</label>
              <select id="f-role" className={fieldClass} value={roleId} onChange={(e) => setRoleId(Number(e.target.value))}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </div>

            {/* Note pour la création */}
            {!isEditing && (
              <p className="text-xs text-(--color-text-secondary)">
                Un email d'invitation sera envoyé automatiquement pour que l'utilisateur définisse son mot de passe.
              </p>
            )}

            {error && <p className="text-sm text-(--color-danger-text)">{error}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-(--color-text-secondary)">
                Annuler
              </button>
              <button type="submit" className="rounded-md bg-(--color-action) px-3 py-2 text-sm text-(--color-action-text) hover:bg-(--color-action-hover)">
                Enregistrer
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 2 : Mettre à jour le type `UserRow` dans `src/features/admin/UsersPage.tsx`**

Ajouter `is_activated: boolean` à la définition du type `UserRow` dans `UsersPage.tsx`. Si la page affiche les utilisateurs dans un tableau, ajouter une colonne « Statut » :

```tsx
// Dans la colonne du tableau ou la liste
<span className={user.is_activated ? 'text-green-600' : 'text-orange-500'}>
  {user.is_activated ? 'Actif' : 'En attente'}
</span>
```

- [ ] **Step 3 : Vérifier TypeScript + build**

```bash
pnpm tsc --noEmit && pnpm lint && pnpm build
```

Attendu : aucune erreur.

- [ ] **Step 4 : Test visuel — créer un utilisateur**

Ouvrir `/admin/utilisateurs`, cliquer « Ajouter un utilisateur », remplir prénom/nom/email/rôle. Le champ mot de passe n'apparaît plus. Enregistrer. Note en bas : « Un email d'invitation sera envoyé… ».

- [ ] **Step 5 : Vérifier gitleaks avant push**

```bash
gitleaks detect -v
```

Attendu : pas de secret détecté.

- [ ] **Step 6 : Commit final**

```bash
git add src/features/admin/UserFormModal.tsx src/features/admin/UsersPage.tsx
git commit -m "feat(admin): UserFormModal sans champ password — statut + bouton renvoyer invitation"
```

---

## Auto-review du plan

**Couverture de la spec :**

| Exigence de la spec | Tâche couvrant |
|---|---|
| Règle longueur par rôle (8/12) | Task 2 |
| Niveau « Fort » pour Éditeur/Admin | Task 2 + Task 6 |
| Jauge masquée pour abonnés | Task 6-7 |
| Gardien unique remplace la règle dupliquée | Task 2 (intégration dans auth.php) + Task 4 (suppression dans users.php) |
| PHPMailer + config SMTP sans secret en dur | Task 3 |
| Table des jetons (hash, usage unique, expiration) | Task 1 + Task 4 |
| Invitation par email (création compte) | Task 4 + Task 5 + Task 9 |
| Admin ne saisit plus de mot de passe | Task 4 (dal_create_user), Task 9 (UI) |
| Connexion refusée si compte non activé | Task 5 (\_auth\_login) |
| Bouton « Renvoyer l'invitation » | Task 4 (dal_resend_invite) + Task 5 (endpoint) + Task 9 (UI) |
| Mot de passe oublié (anti-énumération) | Task 5 (\_auth\_forgot\_password) |
| Rate-limiting demandes reset | Task 1 (table) + Task 5 |
| Lien « Mot de passe oublié ? » sur LoginPage | Task 8 |
| Page de définition du mot de passe | Task 7 |
| Comptes existants non impactés | Task 1 (`UPDATE users SET password_set_at = created_at`) |
| Gitleaks bloquant | Chaque task (step commit) |

**Scan placeholder :** aucun TBD ou TODO laissé dans ce document.

**Cohérence des types :**
- `dal_token_create` : retourne `string` (raw token 64 hex) — utilisé tel quel dans Tasks 4, 5, 9.
- `dal_token_find_valid` : retourne `array{id, user_id, type}|null` — utilisé dans Tasks 4, 5.
- `dal_password_validate` : retourne `string[]` — utilisé dans Tasks 2, 5.
- `usePasswordStrength` : retourne `'weak'|'medium'|'strong'` — utilisé dans Tasks 6, 7.
- `apiClient.tokenInfo` : retourne `{ role_id: number, type: 'invite'|'reset' }` — consommé dans Task 7.

**Périmètre :** chaque tâche est indépendamment testable et committable.
