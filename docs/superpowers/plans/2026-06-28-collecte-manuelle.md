# Collecte manuelle & moteur d'import historique — Plan d'implémentation (T40)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'éditrice de déclencher la chaîne Telegram à la demande (picto « ⟳ ») et de réviser les lots d'historique. L'ingestion des ~7000 messages d'historique est une opération **ponctuelle de mise en place, exécutée par l'équipe dev en SSH** (pas par l'éditrice). Le tout repose sur un moteur d'import générique réutilisable.

**Architecture:** Une **réserve** (`telegram_updates_buffer`) marque chaque message d'une **origine** (`live`/`historique`). Un **module PHP partagé** (`cron/lib/telegram_pipeline.php`) porte collecte/agrégation/réapprovisionnement, appelé par les crons ET un nouvel endpoint. Le live agrège tout l'en-attente immédiatement puis réveille le worker en coulisse (`exec`) ; l'historique entre par un script SSH puis sort en petits lots hebdo via réapprovisionnement automatique. Frontend : picto + toasts sonner + sondage de statut.

**Tech Stack:** PHP 8.1+ (PDO, pas de framework), MariaDB, PHPUnit (suite `dal`), worker Python existant, React 19 + TanStack Query + sonner + Vitest.

**Spec de référence :** `docs/superpowers/specs/2026-06-28-collecte-manuelle-design.md`.

## Global Constraints

- **PHP** : PDO paramètres liés uniquement ; fonctions atelier nommées `epuriel_*`/`tg_*` (snake_case), variables snake_case. Réponses API `{status, data, errors}`.
- **Permissions** : actions de collecte exigent `atelier.lots` (via `dal_require_permission($ctx, 'atelier.lots')`).
- **Pas de tâche longue en HTTP** : l'endpoint fait collecte+agrégation (rapide) puis lance le worker en arrière-plan via `exec('nohup … &')` ; jamais le worker en synchrone.
- **DDL via phpMyAdmin** : la migration 011 ne s'applique pas en SSH (compte sans droits DDL). Les tests DB PHPUnit tournent là où la base `lumosphere_test` existe (serveur/CI), pas forcément en local.
- **Frontend** : jamais `fetch` direct dans les composants → passer par `apiClient` ; invalider `queryKeys.lotsAll` après mutation ; labels FR accentués, identifiants EN. Icônes Phosphor uniquement.
- **Anti-résumé worker** : worker Python `process_telegram_v2.py` inchangé.
- **Sécurité** : le jeton bot reste dans `config/config.php` (hors dépôt) ; `gitleaks detect -v` doit passer.
- **Séparation des flux** : `origin='live'` ne doit jamais atterrir dans un lot historique et inversement.

---

## File Structure

| Fichier | Responsabilité |
|---------|----------------|
| `db/migrations/011_collecte_manuelle.sql` (+ rollback + verify) | `origin` au tampon, `history_import_enabled` aux sources |
| `cron/lib/telegram_pipeline.php` 🆕 | Module partagé : découpage hebdo, parsing export, collecte, agrégation pending, réappro, verrou |
| `cron/collect_telegram_bot.php` ✏️ | Délègue la collecte au module (origine `live`) |
| `cron/agregateur_telegram_weekly.php` ✏️ | Délègue l'agrégation au module, filtre `origin='live'` |
| `cron/import_telegram_history.php` 🆕 | Script SSH : export JSON → réserve `historique` + active l'interrupteur |
| `api/dal/collecte.php` 🆕 | Règles + permission + appel module sous verrou + réveil worker |
| `api/endpoints/collecte.php` 🆕 | Routes `POST /collecte/run`, `POST /collecte/topup` |
| `src/services/api.ts` ✏️ + `queryKeys.ts` ✏️ | Méthodes client + clés |
| `src/features/atelier/useCollecte.ts` 🆕 | Mutations + sondage + toasts |
| `src/features/atelier/AtelierPage.tsx` ✏️ | Picto, pastille progression, réappro au montage, bouton « plus » |
| `tests/dal/TelegramPipelineTest.php` 🆕, `CollecteTest.php` 🆕 | Tests PHP |
| `src/features/atelier/__tests__/useCollecte.test.ts(x)` 🆕 | Tests Vitest |

---

## Task 1 : Migration 011 (schéma BDD)

**Files:**
- Create: `db/migrations/011_collecte_manuelle.sql`
- Create: `db/rollback/011_collecte_manuelle_rollback.sql`
- Create: `db/verify/011_verify_collecte.sql`

**Interfaces:**
- Produces : colonne `telegram_updates_buffer.origin ENUM('live','historique')` ; colonne `collect_sources.history_import_enabled TINYINT(1)`.

- [ ] **Step 1 : Écrire la migration**

Create `db/migrations/011_collecte_manuelle.sql` :

```sql
-- ═══════════════════════════════════════════════════════════════════
-- Lumosphère — Migration 011 : Collecte manuelle + import historique (T40)
-- Cible : MariaDB 11.4.12 (o2switch). À exécuter via phpMyAdmin (droits DDL).
-- Pré-requis : migrations 003–010 appliquées.
-- ═══════════════════════════════════════════════════════════════════
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;

-- 1. Réserve : séparer les flux live / historique
ALTER TABLE telegram_updates_buffer
    ADD COLUMN origin ENUM('live','historique') NOT NULL DEFAULT 'live' AFTER collect_source_id,
    ADD KEY idx_tub_origin (collect_source_id, origin, buffer_status);

-- 2. Sources : interrupteur du tapis roulant historique
ALTER TABLE collect_sources
    ADD COLUMN history_import_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER enabled;

-- 3. Seed schema_version
INSERT INTO schema_version (version, description) VALUES
    (11, '011 — collecte manuelle : buffer.origin (live/historique), collect_sources.history_import_enabled');
-- Fin migration 011.
```

- [ ] **Step 2 : Écrire le rollback**

Create `db/rollback/011_collecte_manuelle_rollback.sql` :

```sql
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE telegram_updates_buffer DROP KEY idx_tub_origin, DROP COLUMN origin;
ALTER TABLE collect_sources DROP COLUMN history_import_enabled;
DELETE FROM schema_version WHERE version = 11;
```

- [ ] **Step 3 : Écrire le script de vérification**

Create `db/verify/011_verify_collecte.sql` :

```sql
-- Doit renvoyer 2 lignes (origin, history_import_enabled présents)
SELECT 'buffer.origin' AS check_name, COUNT(*) AS ok
  FROM information_schema.columns
 WHERE table_name='telegram_updates_buffer' AND column_name='origin'
UNION ALL
SELECT 'sources.history_import_enabled', COUNT(*)
  FROM information_schema.columns
 WHERE table_name='collect_sources' AND column_name='history_import_enabled';
```

- [ ] **Step 4 : Vérifier la cohérence (revue manuelle)**

Run: `grep -c "ALTER TABLE\|schema_version" db/migrations/011_collecte_manuelle.sql`
Expected: `3` (deux ALTER + un INSERT).

- [ ] **Step 5 : Commit**

```bash
git add db/migrations/011_collecte_manuelle.sql db/rollback/011_collecte_manuelle_rollback.sql db/verify/011_verify_collecte.sql
git commit -m "feat(db): migration 011 — buffer.origin + history_import_enabled"
```

> ⚠️ **Application serveur** : exécuter `011` via phpMyAdmin avant tout test backend. Non testable en local (pas de droits DDL en SSH).

---

## Task 2 : Découpage hebdomadaire (fonction pure)

**Files:**
- Create: `cron/lib/telegram_pipeline.php`
- Test: `tests/dal/TelegramPipelineTest.php`

**Interfaces:**
- Produces : `tg_slice_messages_by_week(array $messages): array` — groupe une liste de messages `['message_id'=>int,'date'=>string ISO,'text'=>string]` en semaines ISO, **plus ancienne d'abord**. Chaque groupe : `['week_key'=>'2026-W26','date_debut'=>'2026-06-22','date_fin'=>'2026-06-28','messages'=>[…]]`.

- [ ] **Step 1 : Écrire le test qui échoue**

Create `tests/dal/TelegramPipelineTest.php` :

```php
<?php
declare(strict_types=1);
namespace Tests\Dal;

use PHPUnit\Framework\TestCase;
require_once __DIR__ . '/../../cron/lib/telegram_pipeline.php';

class TelegramPipelineTest extends TestCase
{
    public function testSliceEmptyReturnsEmpty(): void
    {
        $this->assertSame([], tg_slice_messages_by_week([]));
    }

    public function testSliceGroupsByIsoWeekOldestFirst(): void
    {
        $messages = [
            ['message_id' => 3, 'date' => '2026-06-29T08:00:00', 'text' => 'semaine 27'],
            ['message_id' => 1, 'date' => '2026-06-22T10:00:00', 'text' => 'lundi s26'],
            ['message_id' => 2, 'date' => '2026-06-28T23:00:00', 'text' => 'dimanche s26'],
        ];
        $weeks = tg_slice_messages_by_week($messages);

        $this->assertCount(2, $weeks);
        // plus ancienne d'abord
        $this->assertSame('2026-W26', $weeks[0]['week_key']);
        $this->assertSame('2026-06-22', $weeks[0]['date_debut']);
        $this->assertSame('2026-06-28', $weeks[0]['date_fin']);
        $this->assertCount(2, $weeks[0]['messages']);
        $this->assertSame('2026-W27', $weeks[1]['week_key']);
        $this->assertCount(1, $weeks[1]['messages']);
    }
}
```

- [ ] **Step 2 : Lancer le test → échec**

Run: `vendor/bin/phpunit --filter TelegramPipelineTest tests/dal/TelegramPipelineTest.php`
Expected: FAIL (`tg_slice_messages_by_week` introuvable / fichier absent).

- [ ] **Step 3 : Implémenter le module + la fonction**

Create `cron/lib/telegram_pipeline.php` :

```php
<?php

declare(strict_types=1);

/**
 * Module partagé de la chaîne Telegram (collecte / agrégation / réappro).
 * Appelé par les crons ET l'endpoint /api/collecte.
 */

/**
 * Groupe des messages par semaine ISO (lundi→dimanche), plus ancienne d'abord.
 *
 * @param list<array{message_id:int,date:string,text:string}> $messages
 * @return list<array{week_key:string,date_debut:string,date_fin:string,messages:list<array>}>
 */
function tg_slice_messages_by_week(array $messages): array
{
    $groups = [];
    foreach ($messages as $msg) {
        $date = new \DateTimeImmutable((string) $msg['date']);
        $weekKey = $date->format('o-\WW'); // ex. 2026-W26
        if (!isset($groups[$weekKey])) {
            $monday = $date->modify('monday this week')->setTime(0, 0, 0);
            $sunday = $monday->modify('+6 days');
            $groups[$weekKey] = [
                'week_key'   => $weekKey,
                'date_debut' => $monday->format('Y-m-d'),
                'date_fin'   => $sunday->format('Y-m-d'),
                'messages'   => [],
            ];
        }
        $groups[$weekKey]['messages'][] = $msg;
    }
    ksort($groups); // ordre chronologique par clé ISO
    return array_values($groups);
}
```

- [ ] **Step 4 : Lancer le test → succès**

Run: `vendor/bin/phpunit --filter TelegramPipelineTest tests/dal/TelegramPipelineTest.php`
Expected: PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add cron/lib/telegram_pipeline.php tests/dal/TelegramPipelineTest.php
git commit -m "feat(atelier): tg_slice_messages_by_week — découpage hebdo testé"
```

---

## Task 3 : Parsing d'un export Telegram Desktop (fonction pure)

**Files:**
- Modify: `cron/lib/telegram_pipeline.php`
- Modify: `tests/dal/TelegramPipelineTest.php`

**Interfaces:**
- Consumes : rien.
- Produces : `tg_parse_telegram_export(array $json): array` — depuis un export Telegram Desktop décodé, renvoie `list<array{message_id:int,date:string,text:string}>`, en ignorant les entrées sans texte (médias seuls, services). Le champ `text` de l'export peut être une chaîne **ou** un tableau de fragments (chaînes ou `['type'=>…,'text'=>…]`) : on aplatit en concaténant les `text`.

- [ ] **Step 1 : Ajouter le test qui échoue**

Add to `tests/dal/TelegramPipelineTest.php` (dans la classe) :

```php
    public function testParseExportFlattensTextAndSkipsEmpty(): void
    {
        $json = ['messages' => [
            ['id' => 10, 'type' => 'message', 'date' => '2026-06-22T10:00:00', 'text' => 'simple'],
            ['id' => 11, 'type' => 'message', 'date' => '2026-06-22T11:00:00',
             'text' => ['avant ', ['type' => 'hashtag', 'text' => '#foi'], ' après']],
            ['id' => 12, 'type' => 'message', 'date' => '2026-06-22T12:00:00', 'text' => ''], // vide → ignoré
            ['id' => 13, 'type' => 'service', 'date' => '2026-06-22T13:00:00', 'action' => 'pin'], // service → ignoré
        ]];
        $out = tg_parse_telegram_export($json);

        $this->assertCount(2, $out);
        $this->assertSame(10, $out[0]['message_id']);
        $this->assertSame('simple', $out[0]['text']);
        $this->assertSame('avant #foi après', $out[1]['text']);
    }
```

- [ ] **Step 2 : Lancer → échec**

Run: `vendor/bin/phpunit --filter testParseExportFlattensTextAndSkipsEmpty tests/dal/TelegramPipelineTest.php`
Expected: FAIL (`tg_parse_telegram_export` introuvable).

- [ ] **Step 3 : Implémenter**

Add to `cron/lib/telegram_pipeline.php` :

```php
/**
 * Normalise un export Telegram Desktop (JSON décodé) en messages texte.
 *
 * @param array $json  Contenu décodé (clé "messages")
 * @return list<array{message_id:int,date:string,text:string}>
 */
function tg_parse_telegram_export(array $json): array
{
    $out = [];
    foreach ($json['messages'] ?? [] as $m) {
        if (($m['type'] ?? '') !== 'message') {
            continue; // ignore les messages de service
        }
        $text = tg_flatten_export_text($m['text'] ?? '');
        if (trim($text) === '') {
            continue; // ignore les médias seuls / vides
        }
        $out[] = [
            'message_id' => (int) ($m['id'] ?? 0),
            'date'       => (string) ($m['date'] ?? ''),
            'text'       => $text,
        ];
    }
    return $out;
}

/** Aplatit le champ "text" (chaîne ou tableau de fragments) en texte brut. */
function tg_flatten_export_text(mixed $text): string
{
    if (is_string($text)) {
        return $text;
    }
    if (!is_array($text)) {
        return '';
    }
    $parts = [];
    foreach ($text as $frag) {
        if (is_string($frag)) {
            $parts[] = $frag;
        } elseif (is_array($frag) && isset($frag['text'])) {
            $parts[] = (string) $frag['text'];
        }
    }
    return implode('', $parts);
}
```

- [ ] **Step 4 : Lancer → succès**

Run: `vendor/bin/phpunit tests/dal/TelegramPipelineTest.php`
Expected: PASS (3 tests).

- [ ] **Step 5 : Commit**

```bash
git add cron/lib/telegram_pipeline.php tests/dal/TelegramPipelineTest.php
git commit -m "feat(atelier): tg_parse_telegram_export — parsing export Desktop"
```

---

## Task 4 : Agrégation « pending » filtrée par origine (DB)

**Files:**
- Modify: `cron/lib/telegram_pipeline.php`
- Modify: `tests/dal/TelegramPipelineTest.php`

**Interfaces:**
- Consumes : `tg_slice_messages_by_week`.
- Produces : `tg_aggregate_source(PDO $pdo, array $source, string $origin, ?string $date_from, ?string $date_to): array` — crée **1 lot** (+ documents + job `process_telegram_v2`) à partir des lignes `telegram_updates_buffer` de la source filtrées `buffer_status='buffered'` et `origin=$origin`, sur la fenêtre `[date_from,date_to]` (null,null = tout l'en-attente). Marque les lignes consommées `lot_created`. Retourne `['lot_id'=>?string,'documents'=>int]` (`lot_id=null` si rien à agréger). Réutilise la logique de `generate_lot_for_source`.

> Cette fonction généralise `generate_lot_for_source` (cron actuel) en ajoutant le filtre `origin` et une fenêtre de dates optionnelle. Le préfixe du lot est `telegram` (live) ou `telegram_hist` (historique) selon `$origin`.

- [ ] **Step 1 : Test DB (suite dal, transaction/rollback)**

Add to `tests/dal/TelegramPipelineTest.php` une méthode utilisant la base de test :

```php
    public function testAggregateLiveCreatesOneLotAndMarksBuffer(): void
    {
        $pdo = \Tests\Dal\TestHelper::getTestPdo();
        $pdo->beginTransaction();
        try {
            // Source telegram de test
            $pdo->prepare("INSERT INTO collect_sources (source_type, label, enabled, config_json)
                           VALUES ('telegram','T',1,'{\"canal\":\"c\",\"chat_id\":\"-100\"}')")->execute();
            $sourceId = (int) $pdo->lastInsertId();
            $source = $pdo->query("SELECT * FROM collect_sources WHERE id=$sourceId")->fetch();

            // 2 messages live bufferisés + 1 historique (ne doit PAS être pris)
            $ins = $pdo->prepare("INSERT INTO telegram_updates_buffer
                (collect_source_id, origin, update_id, message_id, chat_id, message_date, buffer_status, payload_json)
                VALUES (?,?,?,?,?,?, 'buffered', ?)");
            $ins->execute([$sourceId,'live',1,101,-100,'2026-06-22 10:00:00','{"message_id":101,"date":"2026-06-22T10:00:00","text":"a"}']);
            $ins->execute([$sourceId,'live',2,102,-100,'2026-06-23 10:00:00','{"message_id":102,"date":"2026-06-23T10:00:00","text":"b"}']);
            $ins->execute([$sourceId,'historique',3,103,-100,'2026-01-01 10:00:00','{"message_id":103,"date":"2026-01-01T10:00:00","text":"vieux"}']);

            $res = tg_aggregate_source($pdo, $source, 'live', null, null);

            $this->assertNotNull($res['lot_id']);
            $this->assertSame(2, $res['documents']);
            // le message historique reste bufferisé
            $still = $pdo->query("SELECT buffer_status FROM telegram_updates_buffer WHERE message_id=103")->fetchColumn();
            $this->assertSame('buffered', $still);
            // les live sont consommés
            $live = $pdo->query("SELECT COUNT(*) FROM telegram_updates_buffer WHERE origin='live' AND buffer_status='lot_created'")->fetchColumn();
            $this->assertSame(2, (int) $live);
        } finally {
            $pdo->rollBack();
        }
    }
```

- [ ] **Step 2 : Lancer → échec**

Run: `vendor/bin/phpunit --filter testAggregateLiveCreatesOneLotAndMarksBuffer tests/dal/TelegramPipelineTest.php`
Expected: FAIL (`tg_aggregate_source` introuvable). *(Si base `lumosphere_test` absente en local : exécuter sur le serveur/CI.)*

- [ ] **Step 3 : Implémenter `tg_aggregate_source`**

Add to `cron/lib/telegram_pipeline.php` :

```php
/**
 * Crée 1 lot (+documents+job) depuis le tampon d'une source, filtré par origine.
 * @return array{lot_id:?string,documents:int}
 */
function tg_aggregate_source(PDO $pdo, array $source, string $origin, ?string $date_from, ?string $date_to): array
{
    $sql = "SELECT * FROM telegram_updates_buffer
            WHERE collect_source_id = ? AND origin = ? AND buffer_status = 'buffered'";
    $params = [(int) $source['id'], $origin];
    if ($date_from !== null && $date_to !== null) {
        $sql .= " AND DATE(message_date) BETWEEN ? AND ?";
        $params[] = $date_from;
        $params[] = $date_to;
    }
    $sql .= " ORDER BY message_date ASC, message_id ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    if (count($rows) === 0) {
        return ['lot_id' => null, 'documents' => 0];
    }

    $messages = [];
    $bufferIds = [];
    foreach ($rows as $row) {
        $payload = json_decode((string) $row['payload_json'], true);
        if (is_array($payload) && trim((string) ($payload['text'] ?? '')) !== '') {
            $messages[] = $payload;
        }
        $bufferIds[] = (int) $row['id'];
    }
    if (count($messages) === 0) {
        return ['lot_id' => null, 'documents' => 0];
    }

    $configJson = json_decode((string) ($source['config_json'] ?? '{}'), true) ?: [];
    $canal = trim((string) ($configJson['canal'] ?? $messages[0]['chat_username'] ?? ''));
    $oeuvreId = isset($configJson['oeuvre_id']) ? (int) $configJson['oeuvre_id'] : null;

    $dates = [
        substr((string) ($messages[0]['date'] ?? ''), 0, 10),
        substr((string) ($messages[count($messages) - 1]['date'] ?? ''), 0, 10),
    ];
    $debut = $date_from ?? ($dates[0] ?: date('Y-m-d'));
    $fin = $date_to ?? ($dates[1] ?: $debut);
    $prefix = $origin === 'historique' ? 'telegram_hist' : 'telegram';
    $lotId = tg_next_lot_id($pdo, $prefix, $debut);
    $titrePrefix = $origin === 'historique' ? 'Telegram historique Lulumineuse' : 'Telegram Lulumineuse';
    $title = "$titrePrefix $debut - $fin";

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO lots (lot_id, source_type, titre_lot, status, date_source_debut, date_source_fin)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$lotId, 'telegram', $title, 'en_attente', $debut, $fin]);

        $docStmt = $pdo->prepare(
            'INSERT INTO documents (lot_id, titre, type_document, status, source_item_id, contenu_brut, hash_contenu, selected, date_publication, oeuvre_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
        );
        $docCount = 0;
        foreach ($messages as $msg) {
            $text = trim((string) ($msg['text'] ?? ''));
            if ($text === '') {
                continue;
            }
            $docStmt->execute([
                $lotId,
                mb_substr($text, 0, 80, 'UTF-8'),
                'telegram',
                'en_attente',
                (string) ($msg['message_id'] ?? ''),
                $text,
                hash('sha256', $text),
                isset($msg['date']) ? substr((string) $msg['date'], 0, 10) : null,
                $oeuvreId,
            ]);
            $docCount++;
        }

        $placeholders = implode(',', array_fill(0, count($bufferIds), '?'));
        $pdo->prepare("UPDATE telegram_updates_buffer SET buffer_status='lot_created', lot_id=? WHERE id IN ($placeholders)")
            ->execute([$lotId, ...$bufferIds]);

        $pdo->prepare(
            "INSERT INTO journal_events (lot_id, action, old_status, new_status, actor, message)
             VALUES (?, 'creation_lot_telegram', NULL, 'en_attente', 'system', ?)"
        )->execute([$lotId, "Lot Telegram ($origin) $docCount message(s) depuis le tampon"]);

        $pdo->prepare(
            "INSERT INTO server_jobs (job_id, lot_id, job_type, status, priority, payload_json)
             VALUES (?, ?, 'process_telegram_v2', 'queued', 6, ?)"
        )->execute([
            'job_' . uniqid('', true),
            $lotId,
            json_encode(['canal' => $canal, 'date_debut' => $debut, 'date_fin' => $fin], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);

        $pdo->commit();
        return ['lot_id' => $lotId, 'documents' => $docCount];
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/** Génère un lot_id séquentiel `<prefix>_<YYYYMMDD>_NNN`. */
function tg_next_lot_id(PDO $pdo, string $prefix, string $date): string
{
    $base = $prefix . '_' . str_replace('-', '', $date);
    $stmt = $pdo->prepare("SELECT lot_id FROM lots WHERE lot_id LIKE ? ORDER BY lot_id DESC LIMIT 1");
    $stmt->execute([$base . '%']);
    $last = $stmt->fetchColumn();
    $seq = $last ? ((int) end($p = explode('_', $last)) + 1) : 1;
    return $base . '_' . str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
}
```

- [ ] **Step 4 : Lancer → succès**

Run: `vendor/bin/phpunit tests/dal/TelegramPipelineTest.php` (sur env. avec base de test)
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add cron/lib/telegram_pipeline.php tests/dal/TelegramPipelineTest.php
git commit -m "feat(atelier): tg_aggregate_source — agrégation pending filtrée par origine"
```

---

## Task 5 : Collecte vers la réserve + verrou (DB)

**Files:**
- Modify: `cron/lib/telegram_pipeline.php`

**Interfaces:**
- Produces :
  - `tg_collect_into_buffer(PDO $pdo, array $config, string $origin = 'live'): int` — extrait `getUpdates`, range dans `telegram_updates_buffer` avec l'origine donnée, retourne le nombre stocké. Déplace ici les helpers de `collect_telegram_bot.php` (`epuriel_telegram_*`).
  - `tg_with_source_lock(PDO $pdo, int $source_id, callable $fn): mixed` — exécute `$fn` sous verrou MySQL `GET_LOCK("tg_source_<id>", 0)` ; lève `RuntimeException('collecte déjà en cours')` si le verrou est pris.

- [ ] **Step 1 : Implémenter le verrou + un test pur du nom de verrou**

Add to `tests/dal/TelegramPipelineTest.php` :

```php
    public function testLockNameIsScopedBySource(): void
    {
        $this->assertSame('tg_source_42', tg_source_lock_name(42));
    }
```

Run: `vendor/bin/phpunit --filter testLockNameIsScopedBySource tests/dal/TelegramPipelineTest.php`
Expected: FAIL.

- [ ] **Step 2 : Écrire le code (verrou + collecte)**

Add to `cron/lib/telegram_pipeline.php` :

```php
function tg_source_lock_name(int $source_id): string
{
    return 'tg_source_' . $source_id;
}

/** Exécute $fn sous verrou MySQL par source (refuse si déjà pris). */
function tg_with_source_lock(PDO $pdo, int $source_id, callable $fn): mixed
{
    $name = tg_source_lock_name($source_id);
    $got = (int) $pdo->query("SELECT GET_LOCK(" . $pdo->quote($name) . ", 0)")->fetchColumn();
    if ($got !== 1) {
        throw new RuntimeException('Collecte déjà en cours pour cette source.');
    }
    try {
        return $fn();
    } finally {
        $pdo->query("SELECT RELEASE_LOCK(" . $pdo->quote($name) . ")");
    }
}
```

Puis **déplacer** depuis `cron/collect_telegram_bot.php` vers le module les fonctions `epuriel_telegram_due_sources`, `epuriel_telegram_next_update_offset`, `epuriel_telegram_get_updates`, `epuriel_telegram_store_updates`, `epuriel_telegram_source_chat_id`, `epuriel_telegram_message_payload`, `epuriel_telegram_payload_entities`, et ajouter le wrapper :

```php
/** Collecte getUpdates → réserve (origine paramétrée). Retourne le nb stocké. */
function tg_collect_into_buffer(PDO $pdo, array $config, string $origin = 'live'): int
{
    $token = trim((string) ($config['telegram_bot_token'] ?? ''));
    if ($token === '') {
        throw new RuntimeException('telegram_bot_token absent de config.php');
    }
    $sources = epuriel_telegram_due_sources($pdo);
    if (count($sources) === 0) {
        return 0;
    }
    $offset = epuriel_telegram_next_update_offset($sources);
    $updates = epuriel_telegram_get_updates($token, $offset);
    return epuriel_telegram_store_updates($pdo, $sources, $updates, $origin);
}
```

Modifier la signature de `epuriel_telegram_store_updates(...)` pour accepter `string $origin = 'live'` et l'écrire dans l'INSERT :

```php
$stmt = $pdo->prepare(
    "INSERT IGNORE INTO telegram_updates_buffer
     (collect_source_id, origin, update_id, message_id, chat_id, chat_username, message_date, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);
$stmt->execute([
    (int) $source['id'], $origin, (int) $update['update_id'], (int) $message['message_id'],
    $chatId, $chatUsername, date('Y-m-d H:i:s', (int) ($message['date'] ?? time())), $payloadJson,
]);
```

- [ ] **Step 3 : Lancer → succès (test verrou pur)**

Run: `vendor/bin/phpunit --filter testLockNameIsScopedBySource tests/dal/TelegramPipelineTest.php`
Expected: PASS.

- [ ] **Step 4 : Vérifier la syntaxe PHP**

Run: `php -l cron/lib/telegram_pipeline.php`
Expected: `No syntax errors detected`.

- [ ] **Step 5 : Commit**

```bash
git add cron/lib/telegram_pipeline.php tests/dal/TelegramPipelineTest.php
git commit -m "feat(atelier): tg_collect_into_buffer + verrou par source"
```

---

## Task 6 : Réapprovisionnement historique (tapis roulant, DB)

**Files:**
- Modify: `cron/lib/telegram_pipeline.php`
- Modify: `tests/dal/TelegramPipelineTest.php`

**Interfaces:**
- Consumes : `tg_aggregate_source`, `tg_slice_messages_by_week`.
- Produces : `tg_topup_historical(PDO $pdo, array $source, int $target = 8): array` — tant que `lots "telegram_hist" en_attente < $target` ET qu'il reste des lignes `origin='historique', buffer_status='buffered'`, crée le lot de la **semaine la plus ancienne non sortie**. Respecte `history_import_enabled`. Retourne `['created'=>int,'pending_weeks'=>int]`.

- [ ] **Step 1 : Test DB**

Add to `tests/dal/TelegramPipelineTest.php` :

```php
    public function testTopupCreatesUpToTargetFromHistorique(): void
    {
        $pdo = \Tests\Dal\TestHelper::getTestPdo();
        $pdo->beginTransaction();
        try {
            $pdo->prepare("INSERT INTO collect_sources (source_type,label,enabled,history_import_enabled,config_json)
                           VALUES ('telegram','H',1,1,'{\"canal\":\"c\",\"chat_id\":\"-100\"}')")->execute();
            $sid = (int) $pdo->lastInsertId();
            $source = $pdo->query("SELECT * FROM collect_sources WHERE id=$sid")->fetch();

            // 3 semaines distinctes de messages historiques
            $ins = $pdo->prepare("INSERT INTO telegram_updates_buffer
                (collect_source_id,origin,update_id,message_id,chat_id,message_date,buffer_status,payload_json)
                VALUES (?,?,?,?,?,?, 'buffered', ?)");
            $dates = ['2026-01-05','2026-01-12','2026-01-19']; // 3 lundis = 3 semaines
            foreach ($dates as $i => $d) {
                $ins->execute([$sid,'historique',$i+1,200+$i,-100,"$d 10:00:00",
                    json_encode(['message_id'=>200+$i,'date'=>"{$d}T10:00:00",'text'=>"m$i"])]);
            }

            $res = tg_topup_historical($pdo, $source, 2); // cible 2
            $this->assertSame(2, $res['created']); // 2 lots créés, pas 3
            $pending = $pdo->query("SELECT COUNT(*) FROM lots WHERE lot_id LIKE 'telegram_hist_%' AND status='en_attente'")->fetchColumn();
            $this->assertSame(2, (int) $pending);
        } finally {
            $pdo->rollBack();
        }
    }
```

- [ ] **Step 2 : Lancer → échec**

Run: `vendor/bin/phpunit --filter testTopupCreatesUpToTargetFromHistorique tests/dal/TelegramPipelineTest.php`
Expected: FAIL (`tg_topup_historical` introuvable).

- [ ] **Step 3 : Implémenter**

Add to `cron/lib/telegram_pipeline.php` :

```php
/**
 * Réapprovisionne les lots historiques d'une source jusqu'à $target lots "en_attente".
 * @return array{created:int,pending_weeks:int}
 */
function tg_topup_historical(PDO $pdo, array $source, int $target = 8): array
{
    if ((int) ($source['history_import_enabled'] ?? 0) !== 1) {
        return ['created' => 0, 'pending_weeks' => 0];
    }
    $sid = (int) $source['id'];
    $created = 0;

    $countPending = static function () use ($pdo): int {
        return (int) $pdo->query(
            "SELECT COUNT(*) FROM lots WHERE lot_id LIKE 'telegram_hist_%' AND status = 'en_attente'"
        )->fetchColumn();
    };

    while ($countPending() < $target) {
        // semaine la plus ancienne encore bufferisée
        $stmt = $pdo->prepare(
            "SELECT payload_json FROM telegram_updates_buffer
             WHERE collect_source_id = ? AND origin = 'historique' AND buffer_status = 'buffered'
             ORDER BY message_date ASC, message_id ASC"
        );
        $stmt->execute([$sid]);
        $rows = $stmt->fetchAll();
        if (count($rows) === 0) {
            break; // stock épuisé
        }
        $messages = [];
        foreach ($rows as $r) {
            $p = json_decode((string) $r['payload_json'], true);
            if (is_array($p)) {
                $messages[] = $p;
            }
        }
        $weeks = tg_slice_messages_by_week($messages);
        if (count($weeks) === 0) {
            break;
        }
        $oldest = $weeks[0];
        $res = tg_aggregate_source($pdo, $source, 'historique', $oldest['date_debut'], $oldest['date_fin']);
        if ($res['lot_id'] === null) {
            break; // sécurité anti-boucle
        }
        $created++;
    }

    $remaining = (int) $pdo->prepare(
        "SELECT COUNT(*) FROM telegram_updates_buffer WHERE collect_source_id = ? AND origin = 'historique' AND buffer_status = 'buffered'"
    )->execute([$sid]); // exécution
    $remainingCount = (int) $pdo->query(
        "SELECT COUNT(*) FROM telegram_updates_buffer WHERE collect_source_id = $sid AND origin = 'historique' AND buffer_status = 'buffered'"
    )->fetchColumn();

    return ['created' => $created, 'pending_weeks' => $remainingCount > 0 ? 1 : 0];
}
```

> Note implémenteur : la double requête « remaining » ci-dessus est volontairement simplifiée — garder uniquement la version `$remainingCount` via `query()` et supprimer la ligne `$remaining = …prepare()…execute()` qui est morte. (Laisser le test guider : seule `created` est assertée.)

- [ ] **Step 4 : Nettoyer la ligne morte + relancer**

Supprimer la ligne `$remaining = (int) $pdo->prepare(...)->execute(...);` (artefact). Puis :

Run: `vendor/bin/phpunit tests/dal/TelegramPipelineTest.php`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add cron/lib/telegram_pipeline.php tests/dal/TelegramPipelineTest.php
git commit -m "feat(atelier): tg_topup_historical — tapis roulant hebdo (cible 8)"
```

---

## Task 7 : Brancher les crons sur le module

**Files:**
- Modify: `cron/collect_telegram_bot.php`
- Modify: `cron/agregateur_telegram_weekly.php`

**Interfaces:**
- Consumes : `tg_collect_into_buffer`, `tg_aggregate_source`.

- [ ] **Step 1 : Refactor `collect_telegram_bot.php`**

Remplacer le corps par une délégation au module (les helpers ont été déplacés en Task 5) :

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap_cron.php';
require_once __DIR__ . '/lib/telegram_pipeline.php';

try {
    $stored = tg_collect_into_buffer($pdo, $config, 'live');
    echo "Updates Telegram stockees: $stored\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Erreur collecteur Telegram: ' . $e->getMessage() . "\n");
    exit(1);
}
```

- [ ] **Step 2 : Refactor l'agrégateur — filtre origine 'live'**

Dans `cron/agregateur_telegram_weekly.php`, ajouter en tête `require_once __DIR__ . '/lib/telegram_pipeline.php';` puis remplacer la boucle `generate_lot_for_source(...)` par un appel à `tg_aggregate_source($pdo, $source, 'live', $dateDebut, $dateFin)`, et **supprimer** les fonctions `generate_lot_for_source` / `generate_lot_id` désormais portées par le module. Garder `epuriel_previous_week_dates` et `generate_weekly_telegram_lots` (qui itère les sources et appelle `tg_aggregate_source`).

```php
function generate_weekly_telegram_lots(PDO $pdo, string $dateDebut, string $dateFin): array
{
    $sources = $pdo->query(
        "SELECT * FROM collect_sources
         WHERE source_type IN ('telegram','Telegram') AND enabled = 1 ORDER BY id ASC"
    )->fetchAll();
    $created = [];
    foreach ($sources as $source) {
        $res = tg_aggregate_source($pdo, $source, 'live', $dateDebut, $dateFin);
        if ($res['lot_id'] !== null) {
            $created[] = $res['lot_id'];
        }
    }
    return $created;
}
```

- [ ] **Step 3 : Vérifier la syntaxe**

Run: `php -l cron/collect_telegram_bot.php && php -l cron/agregateur_telegram_weekly.php`
Expected: `No syntax errors detected` (×2).

- [ ] **Step 4 : Relancer toute la suite pipeline (non-régression)**

Run: `vendor/bin/phpunit tests/dal/TelegramPipelineTest.php`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add cron/collect_telegram_bot.php cron/agregateur_telegram_weekly.php
git commit -m "refactor(cron): crons Telegram délèguent au module partagé (origine live)"
```

---

## Task 8 : Script SSH d'import d'historique

**Files:**
- Create: `cron/import_telegram_history.php`

**Interfaces:**
- Consumes : `tg_parse_telegram_export`.
- CLI : `php cron/import_telegram_history.php <collect_source_id> <export.json> [export2.json …]`.

- [ ] **Step 1 : Écrire le script**

Create `cron/import_telegram_history.php` :

```php
<?php

declare(strict_types=1);

/**
 * Import d'un export Telegram Desktop (JSON) dans la réserve, origine 'historique'.
 * Usage : php cron/import_telegram_history.php <collect_source_id> <export.json> [export2.json ...]
 */

require_once __DIR__ . '/bootstrap_cron.php';
require_once __DIR__ . '/lib/telegram_pipeline.php';

$args = array_slice($argv, 1);
if (count($args) < 2) {
    fwrite(STDERR, "Usage: php import_telegram_history.php <source_id> <export.json> [...]\n");
    exit(1);
}
$sourceId = (int) array_shift($args);

try {
    $source = $pdo->prepare("SELECT * FROM collect_sources WHERE id = ? AND source_type IN ('telegram','Telegram')");
    $source->execute([$sourceId]);
    $row = $source->fetch();
    if (!$row) {
        throw new RuntimeException("Source Telegram #$sourceId introuvable.");
    }
    $chatId = (int) (json_decode((string) $row['config_json'], true)['chat_id'] ?? 0);

    $ins = $pdo->prepare(
        "INSERT IGNORE INTO telegram_updates_buffer
         (collect_source_id, origin, update_id, message_id, chat_id, message_date, payload_json)
         VALUES (?, 'historique', ?, ?, ?, ?, ?)"
    );

    $total = 0;
    $stored = 0;
    foreach ($args as $file) {
        if (!is_file($file)) {
            throw new RuntimeException("Fichier introuvable: $file");
        }
        $json = json_decode((string) file_get_contents($file), true);
        if (!is_array($json)) {
            throw new RuntimeException("JSON invalide: $file");
        }
        foreach (tg_parse_telegram_export($json) as $msg) {
            $total++;
            $date = (new DateTimeImmutable($msg['date']))->format('Y-m-d H:i:s');
            $payload = json_encode([
                'message_id' => $msg['message_id'],
                'date' => (new DateTimeImmutable($msg['date']))->format('c'),
                'text' => $msg['text'],
                'entities' => [],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            // update_id synthétique négatif pour ne pas heurter les offsets live
            $ins->execute([$sourceId, -$msg['message_id'], $msg['message_id'], $chatId, $date, $payload]);
            $stored += $ins->rowCount();
        }
    }

    $pdo->prepare("UPDATE collect_sources SET history_import_enabled = 1 WHERE id = ?")->execute([$sourceId]);

    echo "Historique importé: $stored nouveaux / $total lus (source #$sourceId). Tapis roulant activé.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Erreur import historique: ' . $e->getMessage() . "\n");
    exit(1);
}
```

- [ ] **Step 2 : Vérifier la syntaxe**

Run: `php -l cron/import_telegram_history.php`
Expected: `No syntax errors detected`.

- [ ] **Step 3 : Smoke test avec une fixture**

Create `tests/fixtures/telegram_export_sample.json` :

```json
{ "name": "Canal test", "type": "public_channel", "id": 100,
  "messages": [
    { "id": 1, "type": "message", "date": "2026-01-05T10:00:00", "text": "Première citation" },
    { "id": 2, "type": "service", "date": "2026-01-05T10:01:00", "action": "pin_message" },
    { "id": 3, "type": "message", "date": "2026-01-12T09:00:00", "text": ["Avec ", {"type":"hashtag","text":"#foi"}] }
  ] }
```

Vérifier le parsing seul (sans DB) :

Run: `php -r 'require "cron/lib/telegram_pipeline.php"; $j=json_decode(file_get_contents("tests/fixtures/telegram_export_sample.json"),true); var_dump(count(tg_parse_telegram_export($j)));'`
Expected: `int(2)` (le message de service est ignoré).

- [ ] **Step 4 : Commit**

```bash
git add cron/import_telegram_history.php tests/fixtures/telegram_export_sample.json
git commit -m "feat(cron): import_telegram_history — export JSON → réserve historique"
```

---

## Task 9 : DAL collecte (run + topup, réveil worker)

**Files:**
- Create: `api/dal/collecte.php`
- Test: `tests/dal/CollecteTest.php`

**Interfaces:**
- Consumes : `tg_collect_into_buffer`, `tg_aggregate_source`, `tg_topup_historical`, `tg_with_source_lock`, `dal_require_permission`, `dal_ok`.
- Produces :
  - `dal_collecte_run(PDO $pdo, array $ctx, array $config): array` — permission `atelier.lots` ; pour chaque source telegram active : collecte (live) ; agrège tout l'en-attente live (1 lot/source) ; réveille le worker ; retourne `dal_ok(['lots'=>list<string>])`.
  - `dal_collecte_topup(PDO $pdo, array $ctx, int $bonus = 0): array` — permission `atelier.lots` ; pour chaque source `history_import_enabled` : `tg_topup_historical(target = 8 + bonus)` ; retourne `dal_ok(['created'=>int])`.
  - `dal_collecte_wake_worker(array $config): void` — `exec` détaché de `run_jobs.php`.

- [ ] **Step 1 : Test DB (permission refusée sans droit)**

Create `tests/dal/CollecteTest.php` :

```php
<?php
declare(strict_types=1);
namespace Tests\Dal;

use PHPUnit\Framework\TestCase;
require_once __DIR__ . '/../../api/dal/collecte.php';
require_once __DIR__ . '/TestHelper.php';

class CollecteTest extends TestCase
{
    public function testTopupRefusedWithoutPermission(): void
    {
        $pdo = TestHelper::getTestPdo();
        $ctx = ['user_id' => 9, 'permissions' => ['corpus.read']]; // pas atelier.lots
        $this->expectException(\RuntimeException::class);
        dal_collecte_topup($pdo, $ctx, 0);
    }
}
```

- [ ] **Step 2 : Lancer → échec**

Run: `vendor/bin/phpunit --filter testTopupRefusedWithoutPermission tests/dal/CollecteTest.php`
Expected: FAIL (fichier `api/dal/collecte.php` absent).

- [ ] **Step 3 : Implémenter la DAL**

Create `api/dal/collecte.php` :

```php
<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';
require_once dirname(__DIR__, 2) . '/cron/lib/telegram_pipeline.php';

/** Picto live : collecte → agrégation de tout l'en-attente → réveil worker. */
function dal_collecte_run(PDO $pdo, array $ctx, array $config): array
{
    dal_require_permission($ctx, 'atelier.lots');

    $sources = $pdo->query(
        "SELECT * FROM collect_sources WHERE source_type IN ('telegram','Telegram') AND enabled = 1 ORDER BY id ASC"
    )->fetchAll();

    $lots = [];
    foreach ($sources as $source) {
        $created = tg_with_source_lock($pdo, (int) $source['id'], function () use ($pdo, $config, $source) {
            tg_collect_into_buffer($pdo, $config, 'live'); // collecte D'ABORD
            $fresh = $pdo->query("SELECT * FROM collect_sources WHERE id = " . (int) $source['id'])->fetch();
            $res = tg_aggregate_source($pdo, $fresh, 'live', null, null);
            return $res['lot_id'];
        });
        if ($created !== null) {
            $lots[] = $created;
        }
    }

    if (count($lots) > 0) {
        dal_collecte_wake_worker($config);
    }
    return dal_ok(['lots' => $lots]);
}

/** Tapis roulant historique (réappro jusqu'au seuil 8 + bonus). */
function dal_collecte_topup(PDO $pdo, array $ctx, int $bonus = 0): array
{
    dal_require_permission($ctx, 'atelier.lots');
    $target = 8 + max(0, $bonus);

    $sources = $pdo->query(
        "SELECT * FROM collect_sources WHERE source_type IN ('telegram','Telegram') AND history_import_enabled = 1 ORDER BY id ASC"
    )->fetchAll();

    $created = 0;
    foreach ($sources as $source) {
        $res = tg_topup_historical($pdo, $source, $target);
        $created += $res['created'];
    }
    if ($created > 0) {
        dal_collecte_wake_worker($config = require dirname(__DIR__, 2) . '/config/config.php');
    }
    return dal_ok(['created' => $created]);
}

/** Réveille le runner de jobs en arrière-plan (ne bloque pas la requête HTTP). */
function dal_collecte_wake_worker(array $config): void
{
    $php = $config['php_bin'] ?? 'php';
    $runner = dirname(__DIR__, 2) . '/cron/run_jobs.php';
    if (!is_file($runner)) {
        return;
    }
    $cmd = escapeshellarg($php) . ' ' . escapeshellarg($runner) . ' > /dev/null 2>&1 &';
    exec('RUN_JOBS_MAX=20 nohup ' . $cmd);
}
```

> Note : `dal_collecte_topup` recharge `config.php` pour le réveil worker (le `$ctx` n'a pas la config). Acceptable : `config.php` est un simple `require` idempotent.

- [ ] **Step 4 : Lancer → succès**

Run: `vendor/bin/phpunit --filter testTopupRefusedWithoutPermission tests/dal/CollecteTest.php`
Expected: PASS. Puis `php -l api/dal/collecte.php` → `No syntax errors detected`.

- [ ] **Step 5 : Commit**

```bash
git add api/dal/collecte.php tests/dal/CollecteTest.php
git commit -m "feat(api): dal_collecte_run/topup — permission + verrou + réveil worker"
```

---

## Task 10 : Endpoint `/api/collecte`

**Files:**
- Create: `api/endpoints/collecte.php`

**Interfaces:**
- Consumes : `dal_collecte_run`, `dal_collecte_topup`, `dal_error`. Le routeur appelle `endpoint_collecte($pdo, $ctx, $method, $id, $body, $action)` (action = 2ᵉ segment d'URL).
- Routes : `POST /api/collecte/run` ; `POST /api/collecte/topup` (body `{more?: number}`).

- [ ] **Step 1 : Écrire l'endpoint**

Create `api/endpoints/collecte.php` :

```php
<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/collecte.php';

function endpoint_collecte(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    if ($method !== 'POST') {
        return dal_error('Méthode non supportée.');
    }
    $config = require dirname(__DIR__, 2) . '/config/config.php';

    return match ($action) {
        'run'   => dal_collecte_run($pdo, $ctx, $config),
        'topup' => dal_collecte_topup($pdo, $ctx, (int) ($body['more'] ?? 0)),
        default => dal_error('Action de collecte inconnue.'),
    };
}
```

- [ ] **Step 2 : Vérifier la syntaxe**

Run: `php -l api/endpoints/collecte.php`
Expected: `No syntax errors detected`.

- [ ] **Step 3 : Vérifier le routage (revue)**

Le routeur (`api/router.php`) mappe `/api/collecte/run` → `endpoints/collecte.php` → `endpoint_collecte(..., action='run')`. Confirmer qu'aucune route à enregistrer manuellement.

Run: `grep -n "endpoints/' . \$resource" api/router.php`
Expected: ligne confirmant l'auto-découverte par nom de fichier.

- [ ] **Step 4 : Commit**

```bash
git add api/endpoints/collecte.php
git commit -m "feat(api): endpoint POST /collecte/run + /collecte/topup"
```

---

## Task 11 : Client front + types + clés

**Files:**
- Modify: `src/services/api.ts:296` (après les méthodes lots)
- Modify: `src/services/queryKeys.ts:25`
- Modify: `src/features/atelier/types.ts`

**Interfaces:**
- Produces :
  - `apiClient.collecteRun(): Promise<ApiResponse<{lots: string[]}>>`
  - `apiClient.collecteTopup(more?: number): Promise<ApiResponse<{created: number}>>`
  - `queryKeys.collecte = ['collecte'] as const`
  - type `LotStatus` déjà existant (réutilisé par le sondage).

- [ ] **Step 1 : Ajouter les méthodes client**

Dans `src/services/api.ts`, après `deleteLotDocument` (l. ~296) et avant la fermeture de l'objet `apiClient` :

```ts
  // Collecte manuelle (atelier)
  collecteRun: () => post<{ lots: string[] }>('collecte/run', {}),
  collecteTopup: (more = 0) => post<{ created: number }>('collecte/topup', { more }),
```

- [ ] **Step 2 : Ajouter la clé de cache**

Dans `src/services/queryKeys.ts`, après `lotJournal` (l. 25) :

```ts
  collecte: ['collecte'] as const,
```

- [ ] **Step 3 : Vérifier le typecheck**

Run: `pnpm tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/services/api.ts src/services/queryKeys.ts
git commit -m "feat(front): méthodes apiClient collecteRun/collecteTopup + clé cache"
```

---

## Task 12 : Hook `useCollecte` (mutations + sondage + toasts)

**Files:**
- Create: `src/features/atelier/useCollecte.ts`
- Test: `src/features/atelier/__tests__/useCollecte.test.tsx`

**Interfaces:**
- Consumes : `apiClient.collecteRun/collecteTopup`, `queryKeys`, `toast` (sonner), `apiClient.findLots`.
- Produces :
  - `useRunCollect()` → `{ run: () => void, isPending: boolean }` : toast « lancé » au clic ; en succès invalide `queryKeys.lotsAll`, lance le sondage des lots créés ; toasts succès/erreur (lien vers l'atelier).
  - `useTopup()` → `{ topup: (more?: number) => void }` : invalide `queryKeys.lotsAll` après succès.
  - `pollLotsUntilDone(lotIds: string[], onDone, onError)` exporté pour test.

- [ ] **Step 1 : Test du sondage (logique pure, mock apiClient)**

Create `src/features/atelier/__tests__/useCollecte.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pollLotsUntilDone } from '../useCollecte'

vi.mock('@/services/api', () => ({
  apiClient: { findLots: vi.fn() },
}))
import { apiClient } from '@/services/api'

describe('pollLotsUntilDone', () => {
  beforeEach(() => vi.clearAllMocks())

  it('appelle onDone quand tous les lots quittent en_traitement', async () => {
    ;(apiClient.findLots as any)
      .mockResolvedValueOnce({ status: 'ok', data: { items: [{ nom: 'L1', status: 'en_traitement' }] } })
      .mockResolvedValueOnce({ status: 'ok', data: { items: [{ nom: 'L1', status: 'en_revision' }] } })
    const onDone = vi.fn()
    const onError = vi.fn()
    await pollLotsUntilDone(['L1'], onDone, onError, { intervalMs: 1, maxTries: 5 })
    expect(onDone).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
  })

  it('appelle onError si un lot passe en erreur', async () => {
    ;(apiClient.findLots as any).mockResolvedValueOnce({
      status: 'ok', data: { items: [{ nom: 'L1', status: 'erreur' }] },
    })
    const onDone = vi.fn()
    const onError = vi.fn()
    await pollLotsUntilDone(['L1'], onDone, onError, { intervalMs: 1, maxTries: 5 })
    expect(onError).toHaveBeenCalledOnce()
    expect(onDone).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2 : Lancer → échec**

Run: `pnpm test -- useCollecte`
Expected: FAIL (`pollLotsUntilDone` introuvable).

- [ ] **Step 3 : Implémenter le hook**

Create `src/features/atelier/useCollecte.ts` :

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'
import type { Lot } from './types'

type PollOpts = { intervalMs?: number; maxTries?: number }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Sonde les lots créés jusqu'à ce qu'ils quittent `en_traitement`. */
export async function pollLotsUntilDone(
  lotIds: string[],
  onDone: () => void,
  onError: () => void,
  opts: PollOpts = {},
): Promise<void> {
  const intervalMs = opts.intervalMs ?? 4000
  const maxTries = opts.maxTries ?? 60
  for (let i = 0; i < maxTries; i++) {
    const res = await apiClient.findLots()
    if (res.status === 'ok') {
      const items = (res.data?.items ?? []) as Array<Pick<Lot, 'nom' | 'status'>>
      const mine = items.filter((l) => lotIds.includes(l.nom))
      if (mine.some((l) => l.status === 'erreur')) {
        onError()
        return
      }
      if (mine.length > 0 && mine.every((l) => l.status !== 'en_traitement')) {
        onDone()
        return
      }
    }
    await sleep(intervalMs)
  }
}

export function useRunCollect() {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.collecteRun()
      if (res.status === 'error') throw new Error(res.errors[0])
      return res.data as { lots: string[] }
    },
    onMutate: () => {
      toast.loading('📥 Récupération lancée, traitement en cours…', { id: 'collecte' })
    },
    onError: (e) => {
      toast.error(`⚠️ La récupération a échoué : ${(e as Error).message}`, { id: 'collecte', duration: 10000 })
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.lotsAll })
      if (data.lots.length === 0) {
        toast.info('Aucun nouveau message à récupérer.', { id: 'collecte' })
        return
      }
      toast.success(`Lot créé, nettoyage en cours… (${data.lots.length})`, { id: 'collecte' })
      void pollLotsUntilDone(
        data.lots,
        () => {
          qc.invalidateQueries({ queryKey: queryKeys.lotsAll })
          toast.success('✅ Lot prêt à réviser', {
            duration: Infinity, // reste jusqu'au clic (toast actionnable)
            action: { label: 'Ouvrir l’atelier', onClick: () => (window.location.href = '/atelier') },
          })
        },
        () => {
          qc.invalidateQueries({ queryKey: queryKeys.lotsAll })
          toast.error('⚠️ Le traitement a échoué, voir le lot', {
            duration: Infinity,
            action: { label: 'Voir', onClick: () => (window.location.href = '/atelier') },
          })
        },
      )
    },
  })
  return { run: () => mutation.mutate(), isPending: mutation.isPending }
}

export function useTopup() {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (more = 0) => {
      const res = await apiClient.collecteTopup(more)
      if (res.status === 'error') throw new Error(res.errors[0])
      return res.data as { created: number }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.lotsAll }),
  })
  return { topup: (more = 0) => mutation.mutate(more) }
}
```

> Note : le sondage lit `l.status` (type `Lot.status: LotStatus`, champ confirmé dans `types.ts`) et `l.nom` (le titre du lot renvoyé par `findLots`).

- [ ] **Step 4 : Lancer → succès**

Run: `pnpm test -- useCollecte`
Expected: PASS (2 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/features/atelier/useCollecte.ts src/features/atelier/__tests__/useCollecte.test.tsx
git commit -m "feat(atelier): useCollecte — run/topup + sondage + toasts sonner"
```

---

## Task 13 : UI atelier (picto, pastille, réappro au montage, bouton « plus »)

**Files:**
- Modify: `src/features/atelier/AtelierPage.tsx`

**Interfaces:**
- Consumes : `useRunCollect`, `useTopup`. Icône Phosphor `ArrowsClockwise` (cohérent avec la banque d'icônes du projet).

- [ ] **Step 1 : Importer les hooks et icône**

Dans `src/features/atelier/AtelierPage.tsx`, étendre les imports :

```tsx
import { Factory, MagnifyingGlass, ArrowsClockwise } from '@phosphor-icons/react'
import { useRunCollect, useTopup } from './useCollecte'
import { useEffect } from 'react'
```

- [ ] **Step 2 : Brancher les hooks + réappro au montage**

Dans le composant `AtelierPage`, après les hooks de données :

```tsx
  const { run, isPending: collecting } = useRunCollect()
  const { topup } = useTopup()
  // Réapprovisionne l'historique à l'ouverture de l'atelier (idempotent côté serveur)
  useEffect(() => {
    topup(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

- [ ] **Step 3 : Ajouter le picto sur la ligne `telegram` de la carte SOURCE**

Dans la carte « Source » (bloc `{['', 'telegram', 'pdf', 'youtube', 'html'].map(...)}`), remplacer le `<button>` par une ligne combinant le filtre et, pour `telegram`, le picto :

```tsx
              {['', 'telegram', 'pdf', 'youtube', 'html'].map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSourceFilter(s)}
                    className={`flex flex-1 items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
                      sourceFilter === s
                        ? 'bg-(--color-bg-hover) font-medium text-(--color-text)'
                        : 'text-(--color-text-muted) hover:bg-(--color-bg-hover)'
                    }`}
                  >
                    {s || 'Toutes'}
                  </button>
                  {s === 'telegram' && (
                    <button
                      type="button"
                      onClick={() => run()}
                      disabled={collecting}
                      title="Tout récupérer maintenant"
                      aria-label="Tout récupérer maintenant depuis Telegram"
                      className="rounded p-1 text-(--color-text-muted) hover:bg-(--color-bg-hover) hover:text-(--color-accent) disabled:opacity-50"
                    >
                      <ArrowsClockwise size={16} className={collecting ? 'animate-spin' : ''} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
```

- [ ] **Step 4 : Bouton « m'en donner plus » (sous la carte Source)**

Juste après la carte Source (avant la fermeture de `<aside>`), ajouter :

```tsx
          <button
            type="button"
            onClick={() => topup(4)}
            className="w-full rounded-lg border border-(--color-border) bg-(--color-bg-card) px-2 py-1.5 text-xs text-(--color-text-muted) hover:bg-(--color-bg-hover)"
          >
            + M'en donner plus (historique)
          </button>
```

- [ ] **Step 5 : Vérifier lint + build + typecheck**

Run: `pnpm tsc --noEmit && pnpm lint && pnpm build`
Expected: typecheck OK ; lint sans erreur (warnings préexistants tolérés) ; build réussi.

- [ ] **Step 6 : Commit**

```bash
git add src/features/atelier/AtelierPage.tsx
git commit -m "feat(atelier): picto collecte Telegram + réappro historique au montage"
```

---

## Vérification finale (post-implémentation)

1. **Suite PHP** : `vendor/bin/phpunit tests/dal/TelegramPipelineTest.php tests/dal/CollecteTest.php` (sur env. avec base de test) → vert.
2. **Suite front** : `pnpm test` → vert. `pnpm build` → OK. `pnpm tsc --noEmit` → OK.
3. **Syntaxe PHP** : `php -l` sur les 4 fichiers PHP nouveaux/modifiés → OK.
4. **gitleaks** : `gitleaks detect -v` → no leaks.
5. **Serveur (après migration 011 via phpMyAdmin)** :
   - clic picto → 1 lot/canal en `en_traitement` → toast « lancé » → toast « prêt ✅ » avec lien.
   - `php cron/import_telegram_history.php <id> export.json` → réserve historique remplie + interrupteur activé.
   - ouverture atelier → ≤ 8 lots « Telegram historique » en attente ; « m'en donner plus » en ajoute.
   - un message `live` n'atterrit jamais dans un lot historique (vérifier `origin` en base).
   - `history_import_enabled = 0` → plus aucun lot historique généré.

---

## Self-review (couverture spec)

- Décisions 1–6 (live picto, ordre collecte→agrégation, périmètre pending, arrière-plan, toasts, sondage) → Tasks 5, 9, 12, 13. ✓
- Décisions 7–9 (import fichier SSH, découpage hebdo, réappro auto) → Tasks 2, 6, 8, 13. ✓
- Décision 10 (séparation origine) → Tasks 1, 4, 5, 7. ✓
- Décision 11 (interrupteur) → Tasks 1, 6, 8. ✓
- Décision 12 (généricité : découpeur isolé via `tg_slice_messages_by_week` + `tg_topup_historical`) → Tasks 2, 6. ✓
- Données (migration 011) → Task 1. ✓
- Anti-collision (GET_LOCK) → Tasks 5, 9. ✓
- Tests (Vitest + PHPUnit + php -l + manuel) → présents par tâche + vérif finale. ✓
