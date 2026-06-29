<?php

/**
 * Runner de jobs Lumosphère.
 * Traite les jobs en file d'attente (server_jobs).
 * Supporte : process_telegram_v2
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap_cron.php';

['pdo' => $pdo, 'config' => $config] = cron_bootstrap();

$maxJobs = (int) (getenv('RUN_JOBS_MAX') ?: 1);

try {
    $queueBefore = count_job_statuses($pdo);
    $workerId = gethostname() . ':' . getmypid();
    $processed = 0;
    $failed = 0;

    echo 'File attente: ' . ($queueBefore['queued'] ?? 0) . " en attente, ";
    echo ($queueBefore['running'] ?? 0) . " en cours, ";
    echo ($queueBefore['succeeded'] ?? 0) . " reussis, ";
    echo ($queueBefore['failed'] ?? 0) . " echoues\n";

    for ($i = 0; $i < $maxJobs; $i++) {
        $job = claim_job($pdo, $workerId);
        if (!$job) {
            break;
        }

        $processed++;
        echo "Job reserve: {$job['job_id']} ({$job['job_type']})\n";

        try {
            run_job($pdo, $config, $job, $workerId);
        } catch (Throwable $e) {
            $failed++;
            echo "Job en echec: {$job['job_id']} ({$e->getMessage()})\n";
        }
    }

    if ($processed === 0) {
        echo "Aucun job en attente.\n";
    } else {
        echo "Jobs traites: $processed, echecs: $failed.\n";
    }

    exit($failed > 0 && $processed === $failed ? 1 : 0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Erreur runner: ' . $e->getMessage() . "\n");
    exit(1);
}

function count_job_statuses(PDO $pdo): array
{
    $stmt = $pdo->query(
        "SELECT status, COUNT(*) AS total
         FROM server_jobs
         WHERE status IN ('queued', 'running', 'succeeded', 'failed')
         GROUP BY status"
    );
    $counts = ['queued' => 0, 'running' => 0, 'succeeded' => 0, 'failed' => 0];
    foreach ($stmt->fetchAll() as $row) {
        $counts[$row['status']] = (int) $row['total'];
    }
    return $counts;
}

function claim_job(PDO $pdo, string $workerId): ?array
{
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->query(
            "SELECT * FROM server_jobs
             WHERE status = 'queued'
               AND run_after <= NOW()
               AND attempts < max_attempts
             ORDER BY priority DESC, created_at ASC
             LIMIT 1
             FOR UPDATE"
        );
        $job = $stmt->fetch();
        if (!$job) {
            $pdo->commit();
            return null;
        }

        $pdo->prepare(
            "UPDATE server_jobs
             SET status = 'running',
                 attempts = attempts + 1,
                 locked_by = ?,
                 locked_at = NOW(),
                 started_at = NOW(),
                 error_message = NULL
             WHERE id = ?"
        )->execute([$workerId, $job['id']]);
        $pdo->commit();

        $job['status'] = 'running';
        return $job;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function run_job(PDO $pdo, array $config, array $job, string $workerId): void
{
    $payload = json_decode((string) $job['payload_json'], true);
    if (!is_array($payload)) {
        $payload = [];
    }

    try {
        $result = match ($job['job_type']) {
            'process_telegram_v2' => run_process_telegram_v2($pdo, $config, $job, $payload),
            'process_telegram_v1' => run_process_telegram_v1_compat($pdo, $config, $job, $payload),
            default => throw new RuntimeException('Type de job non gere: ' . $job['job_type']),
        };

        $pdo->prepare(
            "UPDATE server_jobs
             SET status = 'succeeded',
                 result_json = ?,
                 finished_at = NOW(),
                 locked_by = ?,
                 updated_at = NOW()
             WHERE id = ?"
        )->execute([
            json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $workerId,
            $job['id'],
        ]);

        log_journal($pdo, $job['lot_id'], 'job_succeeded', null, null,
            'Job ' . $job['job_type'] . ' termine');

        echo "Job termine: {$job['job_id']}\n";
    } catch (Throwable $e) {
        $pdo->prepare(
            "UPDATE server_jobs
             SET status = IF(attempts >= max_attempts, 'failed', 'queued'),
                 error_message = ?,
                 run_after = DATE_ADD(NOW(), INTERVAL 5 MINUTE),
                 finished_at = IF(attempts >= max_attempts, NOW(), NULL),
                 updated_at = NOW()
             WHERE id = ?"
        )->execute([$e->getMessage(), $job['id']]);

        log_journal($pdo, $job['lot_id'], 'job_error', null, 'erreur', $e->getMessage());

        throw $e;
    }
}

/**
 * Nouveau traitement Telegram v2 :
 * - Lit les documents du lot depuis la base
 * - Envoie au worker Python pour nettoyage
 * - Écrit contenu_revise et mots-clés en retour
 * - Passe le lot en en_revision
 */
function run_process_telegram_v2(PDO $pdo, array $config, array $job, array $payload): array
{
    $python = $config['python_bin'] ?? '';
    if ($python === '' || !is_executable($python)) {
        throw new RuntimeException('python_bin absent ou non executable dans config.php');
    }

    $worker = dirname(__DIR__) . '/workers/process_telegram_v2.py';
    if (!is_file($worker)) {
        throw new RuntimeException('Worker Python introuvable: ' . $worker);
    }

    $lotId = $job['lot_id'];

    // Lire les documents du lot depuis la base
    $stmt = $pdo->prepare(
        "SELECT id, source_item_id, contenu_brut FROM documents
         WHERE lot_id = ? AND type_document = 'telegram' AND contenu_brut IS NOT NULL
         ORDER BY id"
    );
    $stmt->execute([$lotId]);
    $docs = $stmt->fetchAll();
    if (empty($docs)) {
        throw new RuntimeException("Aucun document avec contenu_brut pour le lot $lotId.");
    }

    // Construire l'entrée JSON pour le worker
    $messages = [];
    $docMap = [];
    foreach ($docs as $doc) {
        $messages[] = [
            'message_id' => (int) $doc['source_item_id'],
            'text' => $doc['contenu_brut'],
            'entities' => [],
        ];
        $docMap[(int) $doc['source_item_id']] = (int) $doc['id'];
    }

    $workerInput = json_encode([
        'job_id' => $job['job_id'],
        'messages' => $messages,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    // Appeler le worker Python
    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $proc = proc_open(
        escapeshellarg($python) . ' ' . escapeshellarg($worker),
        $descriptors,
        $pipes
    );
    if (!is_resource($proc)) {
        throw new RuntimeException('Impossible de lancer le worker Python.');
    }

    fwrite($pipes[0], $workerInput);
    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    $code = proc_close($proc);

    if ($code !== 0) {
        throw new RuntimeException("Worker Telegram en echec ($code): $stderr $stdout");
    }

    $result = json_decode($stdout, true);
    if (!is_array($result) || empty($result['ok'])) {
        throw new RuntimeException('Sortie JSON worker invalide: ' . $stdout);
    }

    // Écrire les résultats dans la base
    $updateStmt = $pdo->prepare(
        "UPDATE documents SET contenu_revise = ?, status = 'en_revision' WHERE id = ?"
    );

    $keywordInsert = $pdo->prepare(
        "INSERT INTO lot_document_keywords (document_id, keyword_id, source)
         SELECT ?, k.id, 'manual'
         FROM keywords k WHERE LOWER(k.mot) = LOWER(?)
         ON DUPLICATE KEY UPDATE source = source"
    );

    $keywordCreate = $pdo->prepare(
        "INSERT IGNORE INTO keywords (mot) VALUES (?)"
    );

    $processedCount = 0;
    foreach ($result['segments'] ?? [] as $segment) {
        $msgId = (int) ($segment['message_id'] ?? 0);
        $docId = $docMap[$msgId] ?? null;
        if ($docId === null) {
            continue;
        }

        $cleaned = $segment['contenu_nettoye'] ?? '';
        $updateStmt->execute([$cleaned, $docId]);
        $processedCount++;

        // Associer les mots-clés extraits des hashtags
        foreach ($segment['source_keywords'] ?? [] as $kw) {
            $kw = trim($kw);
            if ($kw === '') {
                continue;
            }
            $keywordCreate->execute([$kw]);
            $keywordInsert->execute([$docId, $kw]);
        }
    }

    // Passer le lot en en_revision
    $pdo->prepare(
        "UPDATE lots SET status = 'en_revision', updated_at = NOW() WHERE lot_id = ?"
    )->execute([$lotId]);

    log_journal($pdo, $lotId, 'traitement_termine', 'en_attente', 'en_revision',
        "$processedCount document(s) traite(s) par le worker Telegram v2");

    return [
        'ok' => true,
        'processed' => $processedCount,
        'stats' => $result['stats'] ?? [],
    ];
}

/**
 * Compatibilité avec les anciens jobs process_telegram_v1.
 * Traite le job avec le nouveau workflow si le lot a des documents en base.
 */
function run_process_telegram_v1_compat(PDO $pdo, array $config, array $job, array $payload): array
{
    return run_process_telegram_v2($pdo, $config, $job, $payload);
}

function log_journal(PDO $pdo, string $lotId, string $action, ?string $oldStatus, ?string $newStatus, string $message): void
{
    $pdo->prepare(
        "INSERT INTO journal_events (lot_id, action, old_status, new_status, actor, message)
         VALUES (?, ?, ?, ?, 'system', ?)"
    )->execute([$lotId, $action, $oldStatus, $newStatus, $message]);
}
