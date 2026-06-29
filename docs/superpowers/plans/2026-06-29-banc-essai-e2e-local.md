# Banc d'essai e2e local + couverture des parcours — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monter en local une copie jetable complète de Lumosphère (front React + API PHP + base de test) que Playwright pilote pour de vrai, en une seule commande, puis recenser tous les parcours et couvrir en premier les règles de droits (cœur du débuguage).

**Architecture:** `pnpm test:e2e` (1) monte la base `lumosphere_test` (migrations 003→013 + seed rôles/œuvres/citations/états), (2) démarre l'API via le serveur intégré PHP (`php -S`) et le front Vite (le proxy Vite `/api → :8080` existe déjà), (3) Playwright se connecte une fois par rôle (storageState) puis joue les specs. Aucun accès au serveur de production.

**Tech Stack:** Playwright (chromium), Vite/React 19, PHP 8.4 (serveur intégré), MariaDB locale, PHPUnit (pour le seul changement de code PHP).

## Global Constraints

- API jamais en production : tout en local sur `lumosphere_test`, base **séparée** de toute autre base locale.
- Secrets : `config/config.php` et fichiers `e2e/.auth/*.json` **jamais versionnés** ; `gitleaks detect -v` doit passer.
- Identifiants techniques en anglais ; libellés UI et messages en français accentué.
- Rôles (constantes `api/dal/core.php`) : `ROLE_ADMIN=1`, `ROLE_EDITEUR=2`, `ROLE_VISITEUR=3`, `ROLE_ABO3=4`, `ROLE_ABO4=5`.
- États : `ETAT_A_CORRIGER=1`, `ETAT_A_REVISER=2`, `ETAT_PUBLIEE=3`.
- Mots de passe de test : **fictifs**, propres à la base locale (`Test1234!`). Aucun secret de prod.
- Collation cible `utf8mb4_unicode_520_ci` (repli `utf8mb4_unicode_ci` si indispo localement).
- Recherche FULLTEXT des **mots courts** (« IA », « âme ») dépend de `innodb_ft_min_token_size=2`, réglage **serveur** (my.cnf + redémarrage). En local par défaut (3), les tests de mots courts sont marqués `skip` tant que le réglage n'est pas appliqué — jamais silencieusement ignorés.
- Commits : Conventional Commits. Ne **pas** pousser sans demande explicite du chef de projet.

---

## File Structure

**Créés :**
- `config/config.test.php.example` — modèle de config locale de test (committable, sans secret).
- `api/server.php` — routeur d'entrée pour le serveur intégré PHP (`php -S`), usage test/dev.
- `scripts/setup-test-db.sh` — (re)crée `lumosphere_test`, applique migrations 003→013, lance le seed.
- `db/seeds/e2e_seed.php` — seed déterministe : utilisateurs par rôle, œuvres (publique + réservée), citations par état (dont soft-deletée), `role_oeuvre_access`.
- `e2e/global-setup.ts` — connexion API par rôle → `e2e/.auth/{role}.json` (storageState).
- `e2e/fixtures.ts` — constantes partagées (emails de test, ids d'œuvres réservées/publiques).
- `e2e/fullstack-smoke.spec.ts` — preuve que le banc d'essai marche (vraie connexion + `/api/auth/me`).
- `e2e/visibilite-droits.spec.ts` — zone exemplaire : filtrage Abo3/Abo4, états, soft-delete.
- `docs/carte-parcours-e2e.md` — la carte (matrice parcours × rôles × cas).
- `tests/cookie_secure_test.php` — test PHPUnit du flag `cookie_secure`.

**Modifiés :**
- `api/bootstrap.php` — charger la config **avant** `session_start()`, lire le flag `cookie_secure`.
- `api/endpoints/auth.php` — utiliser le flag `cookie_secure` dans les `setcookie()`.
- `api/dal/core.php` — helper testable `dal_cookie_secure(array $config): bool`.
- `playwright.config.ts` — `webServer` (PHP + Vite), `globalSetup`, `workers: 1` en local.
- `package.json` — script `test:e2e` enchaînant setup base + Playwright.
- `.gitignore` — `config/config.php`, `e2e/.auth/`.

---

## Task 1 : Flag `cookie_secure` configurable (débloque la session en local http)

**Files:**
- Modify: `api/dal/core.php` (ajout helper)
- Modify: `api/bootstrap.php:5-27` (ordre de chargement + flag)
- Modify: `api/endpoints/auth.php` (2 `setcookie`)
- Test: `tests/cookie_secure_test.php`

**Interfaces:**
- Produces: `dal_cookie_secure(array $config): bool` — `true` par défaut, `false` seulement si `$config['cookie_secure'] === false`. Constante `COOKIE_SECURE` définie dans `bootstrap.php` après chargement config.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/cookie_secure_test.php` :

```php
<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../api/dal/core.php';

final class CookieSecureTest extends TestCase
{
    public function test_secure_par_defaut_si_absent(): void
    {
        self::assertTrue(dal_cookie_secure([]));
    }

    public function test_secure_si_true(): void
    {
        self::assertTrue(dal_cookie_secure(['cookie_secure' => true]));
    }

    public function test_non_secure_si_false(): void
    {
        self::assertFalse(dal_cookie_secure(['cookie_secure' => false]));
    }
}
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `vendor/bin/phpunit tests/cookie_secure_test.php`
Expected: FAIL — `Error: Call to undefined function dal_cookie_secure()`

- [ ] **Step 3: Implémenter le helper**

Dans `api/dal/core.php`, après les constantes (après la ligne `const MAX_PAGE_SIZE = 100;`) :

```php
/**
 * Flag Secure des cookies de session. Sécurisé (HTTPS) par défaut ;
 * désactivable en environnement de test local (HTTP) via config 'cookie_secure' => false.
 */
function dal_cookie_secure(array $config): bool
{
    return ($config['cookie_secure'] ?? true) !== false;
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `vendor/bin/phpunit tests/cookie_secure_test.php`
Expected: PASS (3 tests)

- [ ] **Step 5: Brancher le flag dans bootstrap.php**

Dans `api/bootstrap.php`, **réordonner** : charger la config et définir `COOKIE_SECURE` AVANT `session_start()` (les paramètres de cookie de session doivent être posés avant le démarrage de session). Remplacer le bloc lignes 5-27 par :

```php
// Load config (outside repo) — AVANT session_start (paramètres cookie)
require_once __DIR__ . '/dal/core.php';
$config = require dirname(__DIR__) . '/config/config.php';
date_default_timezone_set($config['timezone'] ?? 'Europe/Paris');
define('COOKIE_SECURE', dal_cookie_secure($config));

// Session config
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', COOKIE_SECURE ? '1' : '0');
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.gc_maxlifetime', '2592000'); // 30 jours : sessions « se souvenir de moi »
session_start();

// PDO
$pdo = dal_get_pdo($config);

// Auth DAL (constants + functions needed for session checks)
require_once __DIR__ . '/dal/auth.php';
```

(Le `_clear_session()` défini juste après reste inchangé ; on a seulement déplacé le chargement de config au-dessus de `session_start()`.)

- [ ] **Step 6: Brancher le flag dans auth.php**

Dans `api/endpoints/auth.php`, dans `_auth_init_session()` et dans le rafraîchissement « remember » de `bootstrap.php`, remplacer `'secure' => true` par `'secure' => COOKIE_SECURE`. Dans `auth.php` (`_auth_init_session`), le `setcookie([... 'secure' => true ...])` devient :

```php
        setcookie(session_name(), session_id(), [
            'expires'  => time() + REMEMBER_DURATION,
            'path'     => '/',
            'secure'   => COOKIE_SECURE,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
```

Et de même dans `api/bootstrap.php` (bloc de rafraîchissement du cookie persistant, `'secure' => true` → `'secure' => COOKIE_SECURE`).

- [ ] **Step 7: Vérifier syntaxe + analyse statique**

Run: `php -l api/bootstrap.php && php -l api/endpoints/auth.php && php -l api/dal/core.php && vendor/bin/phpstan analyse api/bootstrap.php api/endpoints/auth.php api/dal/core.php`
Expected: aucune erreur

- [ ] **Step 8: Commit**

```bash
git add api/dal/core.php api/bootstrap.php api/endpoints/auth.php tests/cookie_secure_test.php
git commit -m "feat(api): flag cookie_secure configurable pour test local http"
```

---

## Task 2 : Routeur du serveur intégré PHP

**Files:**
- Create: `api/server.php`

**Interfaces:**
- Produces: point d'entrée unique servant l'API via `php -S 127.0.0.1:8080 api/server.php`. Toute requête est confiée à `bootstrap.php` (qui retire le préfixe `/api/` et route).

- [ ] **Step 1: Créer le routeur**

`api/server.php` :

```php
<?php

declare(strict_types=1);

// Routeur pour le serveur intégré PHP (php -S) — TEST/DEV uniquement.
// En production, c'est api/.htaccess qui redirige vers bootstrap.php.
// Bloque l'accès direct aux fichiers internes, comme le .htaccess.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '';
$relative = preg_replace('#^/api/#', '', $path);
if (preg_match('#^(dal|endpoints)/#', (string) $relative)
    || preg_match('#^(router|config)\.php$#', (string) $relative)) {
    http_response_code(403);
    exit;
}

require __DIR__ . '/bootstrap.php';
```

- [ ] **Step 2: Vérifier la syntaxe**

Run: `php -l api/server.php`
Expected: `No syntax errors detected`

- [ ] **Step 3: Commit**

```bash
git add api/server.php
git commit -m "feat(api): routeur serveur intégré PHP pour test/dev local"
```

---

## Task 3 : Modèle de config de test

**Files:**
- Create: `config/config.test.php.example`
- Modify: `.gitignore`

**Interfaces:**
- Produces: modèle copié vers `config/config.php` par le script de montage. Clés lues par `dal_get_pdo()` : `db_host`, `db_name`, `db_user`, `db_pass`. Plus `cookie_secure => false`, `allowed_origin`, `litellm_base_url => ''`.

- [ ] **Step 1: Créer le modèle**

`config/config.test.php.example` :

```php
<?php
// Config de TEST local (banc d'essai e2e). Copié vers config/config.php par scripts/setup-test-db.sh.
// Valeurs surchargées par les variables d'environnement E2E_DB_* si présentes.

$config['db_host'] = getenv('E2E_DB_HOST') ?: '127.0.0.1';
$config['db_name'] = getenv('E2E_DB_NAME') ?: 'lumosphere_test';
$config['db_user'] = getenv('E2E_DB_USER') ?: 'root';
$config['db_pass'] = getenv('E2E_DB_PASS') ?: '';

// Cookies de session non-Secure : indispensable en local http (sinon le navigateur les rejette).
$config['cookie_secure'] = false;

$config['timezone']       = 'Europe/Paris';
$config['allowed_origin'] = 'http://localhost:5173';

// IA désactivée en test (aucun appel externe).
$config['litellm_base_url'] = '';
$config['litellm_api_key']  = '';
$config['litellm_model']    = '';

$config['setup_secret'] = 'test-only-not-a-secret';
$config['python_bin']   = 'python3';

return $config;
```

- [ ] **Step 2: Ignorer les fichiers sensibles**

Vérifier que `.gitignore` contient (ajouter les lignes manquantes) :

```
config/config.php
e2e/.auth/
```

Run: `grep -E 'config/config.php|e2e/.auth' .gitignore`
Expected: les deux lignes présentes

- [ ] **Step 3: Commit**

```bash
git add config/config.test.php.example .gitignore
git commit -m "chore(test): modèle de config locale e2e + gitignore"
```

---

## Task 4 : Script de montage de la base de test

**Files:**
- Create: `scripts/setup-test-db.sh`

**Interfaces:**
- Produces: commande `bash scripts/setup-test-db.sh` qui rend `lumosphere_test` prête (schéma + seed) et copie `config/config.test.php.example` → `config/config.php` si absent. Connexion paramétrable par `E2E_DB_USER`/`E2E_DB_PASS`/`E2E_DB_HOST` (défaut `root` sans mot de passe, `127.0.0.1`).

- [ ] **Step 1: Écrire le script**

`scripts/setup-test-db.sh` :

```bash
#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${E2E_DB_HOST:-127.0.0.1}"
DB_USER="${E2E_DB_USER:-root}"
DB_PASS="${E2E_DB_PASS:-}"
DB_NAME="${E2E_DB_NAME:-lumosphere_test}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MYSQL=(mysql -h "$DB_HOST" -u "$DB_USER")
[ -n "$DB_PASS" ] && MYSQL+=("-p$DB_PASS")

echo "→ (Re)création de la base $DB_NAME"
"${MYSQL[@]}" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;
  CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;" \
  || "${MYSQL[@]}" -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;
  CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "→ Application des migrations 003 → 013"
for f in "$ROOT"/db/migrations/0*.sql; do
  echo "   - $(basename "$f")"
  "${MYSQL[@]}" "$DB_NAME" < "$f"
done

echo "→ Config de test"
if [ ! -f "$ROOT/config/config.php" ]; then
  cp "$ROOT/config/config.test.php.example" "$ROOT/config/config.php"
fi

echo "→ Seed e2e (utilisateurs, œuvres, citations)"
E2E_DB_HOST="$DB_HOST" E2E_DB_USER="$DB_USER" E2E_DB_PASS="$DB_PASS" E2E_DB_NAME="$DB_NAME" \
  php "$ROOT/db/seeds/e2e_seed.php"

echo "✓ Base de test prête."
```

- [ ] **Step 2: Rendre exécutable**

Run: `chmod +x scripts/setup-test-db.sh`
Expected: pas de sortie

- [ ] **Step 3: Vérifier l'application du schéma (le seed viendra en Task 5)**

Run: `bash scripts/setup-test-db.sh || true` puis `mysql -h 127.0.0.1 -u root lumosphere_test -e "SHOW TABLES;" | head`
Expected: les tables corpus + auth listées (`citations`, `oeuvres`, `users`, `role_oeuvre_access`, `etats`…). L'étape seed échouera tant que Task 5 n'est pas faite — c'est attendu.

- [ ] **Step 4: Commit**

```bash
git add scripts/setup-test-db.sh
git commit -m "feat(test): script de montage base lumosphere_test (schéma)"
```

---

## Task 5 : Seed e2e déterministe

**Files:**
- Create: `db/seeds/e2e_seed.php`

**Interfaces:**
- Consumes: base `lumosphere_test` avec schéma appliqué (Task 4). Rôles (1-5) et états (1-3) déjà insérés par les migrations 004/003.
- Produces: données fixes référencées par `e2e/fixtures.ts` (Task 6) :
  - utilisateurs : `admin@test.local`, `editeur@test.local`, `abo3@test.local`, `abo4@test.local` (mot de passe `Test1234!`).
  - œuvres : `OEUVRE_PUBLIQUE_ID=1` (aucune entrée `role_oeuvre_access`), `OEUVRE_RESERVEE_ABO4_ID=2` (réservée Abo4 seulement).
  - citations : 1 publiée œuvre publique, 1 publiée œuvre réservée Abo4, 1 `À Corriger`, 1 soft-deletée.

- [ ] **Step 1: Écrire le seed**

`db/seeds/e2e_seed.php` :

```php
<?php

declare(strict_types=1);

// Seed e2e déterministe pour lumosphere_test. Idempotent (TRUNCATE des tables peuplées ici).
$config = [
    'db_host' => getenv('E2E_DB_HOST') ?: '127.0.0.1',
    'db_name' => getenv('E2E_DB_NAME') ?: 'lumosphere_test',
    'db_user' => getenv('E2E_DB_USER') ?: 'root',
    'db_pass' => getenv('E2E_DB_PASS') ?: '',
];

$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']),
    $config['db_user'],
    $config['db_pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$pdo->exec('SET FOREIGN_KEY_CHECKS=0');
foreach (['citation_keywords', 'citations', 'role_oeuvre_access', 'oeuvres', 'auteurs', 'users'] as $t) {
    $pdo->exec("TRUNCATE TABLE {$t}");
}
$pdo->exec('SET FOREIGN_KEY_CHECKS=1');

$hash = password_hash('Test1234!', PASSWORD_BCRYPT);
$users = [
    ['Admin', 'Test', 'admin@test.local', 1],
    ['Editeur', 'Test', 'editeur@test.local', 2],
    ['Abo3', 'Test', 'abo3@test.local', 4],
    ['Abo4', 'Test', 'abo4@test.local', 5],
];
$stmt = $pdo->prepare(
    'INSERT INTO users (prenom, nom, email, password_hash, role_id) VALUES (?, ?, ?, ?, ?)'
);
foreach ($users as $u) {
    $stmt->execute([$u[0], $u[1], $u[2], $hash, $u[3]]);
}

$pdo->exec("INSERT INTO auteurs (id, nom) VALUES (1, 'Auteur Test')");
$pdo->exec("INSERT INTO oeuvres (id, titre, auteur_id) VALUES
    (1, 'Œuvre publique', 1),
    (2, 'Œuvre réservée Abo4', 1)");

// Œuvre 2 réservée au rôle Abo4 (5) uniquement → invisible Visiteur/Abo3.
$pdo->exec('INSERT INTO role_oeuvre_access (role_id, oeuvre_id) VALUES (5, 2)');

// Citations : (contenu, oeuvre_id, etat_id, deleted_at)
$cit = $pdo->prepare(
    'INSERT INTO citations (contenu, oeuvre_id, auteur_id, etat_id, deleted_at)
     VALUES (?, ?, 1, ?, ?)'
);
$cit->execute(['Citation publiée publique sur l\'éveil', 1, 3, null]);
$cit->execute(['Citation publiée réservée Abo4', 2, 3, null]);
$cit->execute(['Citation à corriger', 1, 1, null]);
$cit->execute(['Citation supprimée', 1, 3, '2026-01-01 00:00:00']);

echo "✓ Seed e2e OK\n";
```

> Note implémenteur : si les colonnes réelles de `oeuvres`/`citations` diffèrent (ex. `titre` vs `nom`, présence d'autres NOT NULL), ajuster les INSERT en lisant `db/migrations/003_corpus_fulltext.sql`. Garder les ids et la sémantique (publique vs réservée, 4 états).

- [ ] **Step 2: Lancer le montage complet**

Run: `bash scripts/setup-test-db.sh`
Expected: se termine par `✓ Seed e2e OK` puis `✓ Base de test prête.`

- [ ] **Step 3: Vérifier les données**

Run: `mysql -h 127.0.0.1 -u root lumosphere_test -e "SELECT email, role_id FROM users; SELECT COUNT(*) AS publiees FROM citations WHERE etat_id=3 AND deleted_at IS NULL;"`
Expected: 4 utilisateurs ; 2 citations publiées non supprimées.

- [ ] **Step 4: Commit**

```bash
git add db/seeds/e2e_seed.php
git commit -m "feat(test): seed e2e déterministe (rôles, œuvres, états, soft-delete)"
```

---

## Task 6 : Connexion par rôle (global setup Playwright)

**Files:**
- Create: `e2e/fixtures.ts`
- Create: `e2e/global-setup.ts`

**Interfaces:**
- Consumes: API locale démarrée (Task 7 la lance avant), seed (Task 5).
- Produces: fichiers `e2e/.auth/{admin,editeur,abo3,abo4}.json` (storageState), et constantes exportées par `e2e/fixtures.ts` : `USERS`, `OEUVRE_PUBLIQUE_ID=1`, `OEUVRE_RESERVEE_ABO4_ID=2`, `API_BASE='http://127.0.0.1:8080'`, `APP_BASE='http://localhost:5173'`.

- [ ] **Step 1: Créer les fixtures**

`e2e/fixtures.ts` :

```ts
export const API_BASE = 'http://127.0.0.1:8080'
export const APP_BASE = 'http://localhost:5173'
export const OEUVRE_PUBLIQUE_ID = 1
export const OEUVRE_RESERVEE_ABO4_ID = 2

export const USERS = {
  admin: { email: 'admin@test.local', password: 'Test1234!' },
  editeur: { email: 'editeur@test.local', password: 'Test1234!' },
  abo3: { email: 'abo3@test.local', password: 'Test1234!' },
  abo4: { email: 'abo4@test.local', password: 'Test1234!' },
} as const

export type RoleKey = keyof typeof USERS
export const authFile = (role: RoleKey) => `e2e/.auth/${role}.json`
```

- [ ] **Step 2: Créer le global setup**

`e2e/global-setup.ts` :

```ts
import { request } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { API_BASE, USERS, authFile, type RoleKey } from './fixtures'

export default async function globalSetup() {
  mkdirSync('e2e/.auth', { recursive: true })
  for (const role of Object.keys(USERS) as RoleKey[]) {
    const ctx = await request.newContext({ baseURL: API_BASE })
    const res = await ctx.post('/api/auth/login', { data: USERS[role] })
    if (!res.ok()) {
      throw new Error(`Connexion ${role} échouée : ${res.status()} ${await res.text()}`)
    }
    await ctx.storageState({ path: authFile(role) })
    await ctx.dispose()
  }
}
```

- [ ] **Step 3: Vérifier la compilation TS**

Run: `pnpm tsc --noEmit`
Expected: aucune erreur

- [ ] **Step 4: Commit**

```bash
git add e2e/fixtures.ts e2e/global-setup.ts
git commit -m "feat(test): fixtures e2e + connexion par rôle (storageState)"
```

---

## Task 7 : Câblage Playwright (front + API + globalSetup)

**Files:**
- Modify: `playwright.config.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `pnpm test:e2e` monte la base puis lance Playwright qui démarre PHP+Vite et exécute les specs. `globalSetup` produit les storageState.

- [ ] **Step 1: Mettre à jour la config Playwright**

Remplacer `playwright.config.ts` par :

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: process.env.CI ? undefined : 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'php -S 127.0.0.1:8080 api/server.php',
      url: 'http://127.0.0.1:8080/api/auth/csrf',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
```

- [ ] **Step 2: Ajouter le script npm**

Dans `package.json`, section `scripts`, ajouter/mettre à jour :

```json
    "test:e2e": "bash scripts/setup-test-db.sh && playwright test",
    "test:e2e:ui": "bash scripts/setup-test-db.sh && playwright test --ui"
```

- [ ] **Step 3: Vérifier que tout démarre (sans specs nouvelles encore)**

Run: `pnpm test:e2e -- e2e/smoke.spec.ts`
Expected: la base se monte, PHP + Vite démarrent, le smoke passe (titre Lumosphère). Si le port 8080 est déjà pris, arrêter le processus existant.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts package.json
git commit -m "feat(test): câblage Playwright full-stack (PHP+Vite+globalSetup)"
```

---

## Task 8 : Smoke full-stack (preuve que le banc d'essai fonctionne)

**Files:**
- Create: `e2e/fullstack-smoke.spec.ts`

**Interfaces:**
- Consumes: storageState admin (Task 6), API/front (Task 7).

- [ ] **Step 1: Écrire le test full-stack**

`e2e/fullstack-smoke.spec.ts` :

```ts
import { test, expect } from '@playwright/test'
import { API_BASE, USERS, authFile } from './fixtures'

test('API locale répond et la connexion admin est valide', async ({ request }) => {
  const me = await request.get(`${API_BASE}/api/auth/me`, {
    storageState: authFile('admin'),
  })
  expect(me.ok()).toBeTruthy()
  const body = await me.json()
  expect(body.status).toBe('ok')
  expect(body.data?.email).toBe(USERS.admin.email)
})

test.describe('Admin connecté via storageState', () => {
  test.use({ storageState: authFile('admin') })

  test('accède au tableau d\'administration', async ({ page }) => {
    await page.goto('/admin/utilisateurs')
    await expect(page).toHaveURL(/\/admin\/utilisateurs$/)
    await expect(page.getByRole('button', { name: /déconnexion/i })).toBeVisible()
  })
})
```

- [ ] **Step 2: Lancer**

Run: `pnpm test:e2e -- e2e/fullstack-smoke.spec.ts`
Expected: 2 tests PASS. (Si `/me` renvoie `data: null`, vérifier le flag `cookie_secure=false` de Task 1/3 — c'est la cause habituelle.)

- [ ] **Step 3: Commit**

```bash
git add e2e/fullstack-smoke.spec.ts
git commit -m "test(e2e): smoke full-stack (connexion réelle + accès admin)"
```

---

## Task 9 : La carte des parcours (recensement)

**Files:**
- Create: `docs/carte-parcours-e2e.md`

**Interfaces:**
- Produces: matrice de référence (parcours × rôles × cas) avec statut `[ ]` à couvrir / `[x]` couvert / `(HS)` hors-scope justifié. Chaque spec e2e citera l'item couvert.

- [ ] **Step 1: Écrire la carte**

Reprendre la matrice §5 de la spec `docs/superpowers/specs/2026-06-29-procedure-debuguage-e2e-design.md` sous forme de checklist par zone :
1. Public / corpus / recherche (Visiteur)
2. Connexion / sessions / CSRF
3. Visibilité par rôle (Abo3/Abo4 vs Éditeur/Admin) — **priorité**
4. Atelier (intégration, états, journal)
5. Admin CRUD (12 pages) + règles protégées
6. Transverse (accessibilité, responsive, thème)

Marquer explicitement en `(HS v1)` : appels réels IA/LiteLLM, Telegram, transcription YouTube, OCR, chaîne worker Python complète, mots courts FULLTEXT tant que `innodb_ft_min_token_size=2` n'est pas posé.

- [ ] **Step 2: Cocher ce qui est déjà couvert**

Marquer `[x]` les items couverts par `smoke`, `auth`, `navigation`, `responsive`, `theme`, `fullstack-smoke` existants.

- [ ] **Step 3: Commit**

```bash
git add docs/carte-parcours-e2e.md
git commit -m "docs(test): carte des parcours e2e (matrice parcours × rôles × cas)"
```

---

## Task 10 : Zone exemplaire — visibilité par droits (cœur du débuguage)

**Files:**
- Create: `e2e/visibilite-droits.spec.ts`

**Interfaces:**
- Consumes: seed (Task 5), storageState (Task 6), fixtures (œuvre publique=1, réservée Abo4=2).

- [ ] **Step 1: Écrire les tests de droits (niveau API, déterministes)**

`e2e/visibilite-droits.spec.ts` :

```ts
import { test, expect } from '@playwright/test'
import { API_BASE, authFile } from './fixtures'

// Récupère les contenus de citations renvoyés par l'API corpus.
async function contenus(request, storage?: string): Promise<string[]> {
  const res = await request.get(`${API_BASE}/api/citations`, storage ? { storageState: storage } : {})
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const rows = body.data?.items ?? body.data ?? []
  return rows.map((r: { contenu: string }) => r.contenu)
}

test.describe('Visibilité par rôle (R8) — résultats API', () => {
  test('Visiteur : seulement les citations publiées d\'œuvres publiques', async ({ request }) => {
    const c = await contenus(request)
    expect(c).toContain('Citation publiée publique sur l\'éveil')
    expect(c).not.toContain('Citation publiée réservée Abo4') // œuvre réservée
    expect(c).not.toContain('Citation à corriger') // état non publié
    expect(c).not.toContain('Citation supprimée') // soft-delete (R7)
  })

  test('Abo3 : ne voit pas l\'œuvre réservée Abo4', async ({ request }) => {
    const c = await contenus(request, authFile('abo3'))
    expect(c).not.toContain('Citation publiée réservée Abo4')
  })

  test('Abo4 : voit l\'œuvre qui lui est réservée', async ({ request }) => {
    const c = await contenus(request, authFile('abo4'))
    expect(c).toContain('Citation publiée réservée Abo4')
  })

  test('Éditeur : voit tous les états (corpus.read_all)', async ({ request }) => {
    const c = await contenus(request, authFile('editeur'))
    expect(c).toContain('Citation à corriger')
    expect(c).toContain('Citation publiée réservée Abo4')
  })

  test('Soft-delete masqué même pour l\'éditeur (sans bascule admin)', async ({ request }) => {
    const c = await contenus(request, authFile('editeur'))
    expect(c).not.toContain('Citation supprimée')
  })
})
```

- [ ] **Step 2: Lancer et ajuster au contrat réel de l'API**

Run: `pnpm test:e2e -- e2e/visibilite-droits.spec.ts`
Expected: 5 tests PASS. Si la forme de réponse diffère (`body.data.items` vs autre), lire `api/endpoints/citations.php` et ajuster `contenus()`. Si un test de droit échoue sur le **fond** (ex. Abo3 voit l'œuvre réservée), c'est un **vrai bug de droits** à remonter — ne pas masquer le test.

- [ ] **Step 3: Vérifier aussi au niveau UI (Visiteur)**

Ajouter dans le même fichier :

```ts
test('UI Visiteur : la citation réservée n\'apparaît pas à l\'écran', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/Citation publiée publique/i)).toBeVisible()
  await expect(page.getByText(/Citation publiée réservée Abo4/i)).toHaveCount(0)
})
```

Run: `pnpm test:e2e -- e2e/visibilite-droits.spec.ts`
Expected: 6 tests PASS (ajuster les sélecteurs au rendu réel du corpus si besoin, en s'inspirant des specs existantes).

- [ ] **Step 4: Cocher la carte**

Marquer `[x]` les items de la zone 3 couverts dans `docs/carte-parcours-e2e.md`.

- [ ] **Step 5: Commit**

```bash
git add e2e/visibilite-droits.spec.ts docs/carte-parcours-e2e.md
git commit -m "test(e2e): visibilité par droits (Abo3/Abo4, états, soft-delete)"
```

---

## Task 11 : Vérification finale du banc d'essai

**Files:** aucun (vérification).

- [ ] **Step 1: Lancer toute la suite e2e en une commande**

Run: `pnpm test:e2e`
Expected: base montée + PHP/Vite démarrés + toutes les specs (smoke, auth, navigation, responsive, theme, fullstack-smoke, visibilite-droits) PASS. Rapport dans `playwright-report/`.

- [ ] **Step 2: Vérifier l'absence de secret versionné**

Run: `gitleaks detect -v`
Expected: `no leaks found`

- [ ] **Step 3: Vérifier les contrôles statiques inchangés**

Run: `pnpm lint && pnpm tsc --noEmit && vendor/bin/phpunit && vendor/bin/phpstan analyse`
Expected: tout passe.

- [ ] **Step 4: Commit éventuel de nettoyage**

```bash
git add -A && git commit -m "chore(test): finalisation banc d'essai e2e local" || echo "rien à committer"
```

---

## Suites de couverture (plans de suivi, après ce socle)

Chaque zone restante de la carte est un **plan distinct** réutilisant le banc d'essai (même pattern : seed → storageState → specs par zone) :

- **Plan B — Public / corpus / recherche** : debounce 300 ms, filtres + badges, pagination keyset « charger plus », virtualisation > 200, accent-insensibilité, NotFound. (Mots courts FULLTEXT : `skip` tant que `innodb_ft_min_token_size=2` non posé.)
- **Plan C — Connexion / sessions / CSRF** : login KO + message, **blocage après N échecs**, « se souvenir de moi » vs 2 h, déconnexion, mutation sans `X-CSRF-Token` refusée.
- **Plan D — Atelier** : liste/détail lot, journal, intégration transactionnelle tout-ou-rien, lot non conforme refusé, dédup, intégration ≠ publication. (Workers/IA simulés — `(HS v1)` pour les appels réels.)
- **Plan E — Admin CRUD (12 pages)** : créer/éditer/supprimer par page ; règles protégées (états système non supprimables, rôle Admin non supprimable, jamais de `password_hash` renvoyé, thèmes ≤ 2 niveaux, normalisation mots-clés, validation humaine des mots-clés IA).
- **Plan F — Transverse** : accessibilité (clavier, ARIA, contraste WCAG AA), responsive desktop/tablette/mobile, thème clair/sombre.

---

## Self-Review (rempli par l'auteur du plan)

- **Couverture spec** : §3 banc d'essai → Tasks 1-8, 11 ; §4/§5 carte → Task 9 ; §5.3 droits → Task 10 ; §6 limites → Global Constraints + carte ; §7 lancement → Tasks 7, 11 ; zones §5.1/5.2/5.4/5.5/5.6 → plans de suivi B-F (décomposition assumée, chaque plan livrable seul).
- **Placeholders** : aucun « TBD/TODO » ; le seul point d'ajustement (forme de réponse API, colonnes réelles) est encadré par une instruction de vérification concrète (lire tel fichier) + commande de contrôle.
- **Cohérence des types** : `dal_cookie_secure`/`COOKIE_SECURE`, `authFile(role)`, `USERS`, `OEUVRE_*_ID`, `API_BASE`/`APP_BASE` utilisés de façon identique de Task 1 à Task 10.
