<?php
declare(strict_types=1);
namespace Tests\Dal;

use PHPUnit\Framework\TestCase;
require_once __DIR__ . '/../../cron/lib/telegram_pipeline.php';
require_once __DIR__ . '/TestHelper.php';

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

    public function testLockNameIsScopedBySource(): void
    {
        $this->assertSame('tg_source_42', tg_source_lock_name(42));
    }

    public function testTopupCreatesUpToTargetFromHistorique(): void
    {
        $pdo = \Tests\Dal\TestHelper::getTestPdo();
        $pdo->beginTransaction();
        try {
            $pdo->prepare("INSERT INTO collect_sources (source_type,nom,enabled,history_import_enabled)
                           VALUES ('telegram','H',1,1)")->execute();
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

    public function testAggregateLiveCreatesOneLotAndMarksBuffer(): void
    {
        $pdo = \Tests\Dal\TestHelper::getTestPdo();
        $pdo->beginTransaction();
        try {
            // Source telegram de test (table a `nom`, pas `label`, pas de `config_json`)
            $pdo->prepare("INSERT INTO collect_sources (source_type, nom, enabled)
                           VALUES ('telegram','Canal Test',1)")->execute();
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

    /**
     * Régression doublons : un message édité sur le canal revient avec le MÊME
     * message_id mais un update_id différent (edited_channel_post). Le buffer ne
     * déduplique que par update_id, donc 2 lignes existent. L'agrégation ne doit
     * créer qu'UN document (la dernière version = update_id le plus élevé), et
     * consommer les 2 lignes de buffer.
     */
    public function testAggregateDeduplicatesEditedMessageByMessageId(): void
    {
        $pdo = \Tests\Dal\TestHelper::getTestPdo();
        $pdo->beginTransaction();
        try {
            $pdo->prepare("INSERT INTO collect_sources (source_type, nom, enabled)
                           VALUES ('telegram','Canal Test',1)")->execute();
            $sourceId = (int) $pdo->lastInsertId();
            $source = $pdo->query("SELECT * FROM collect_sources WHERE id=$sourceId")->fetch();

            // Même message_id (500), 2 update_id : original puis édition (texte corrigé).
            $ins = $pdo->prepare("INSERT INTO telegram_updates_buffer
                (collect_source_id, origin, update_id, message_id, chat_id, message_date, buffer_status, payload_json)
                VALUES (?,?,?,?,?,?, 'buffered', ?)");
            $ins->execute([$sourceId,'live',10,500,-100,'2026-06-29 10:00:00','{"message_id":500,"date":"2026-06-29T10:00:00","text":"version initiale"}']);
            $ins->execute([$sourceId,'live',11,500,-100,'2026-06-29 10:00:00','{"message_id":500,"date":"2026-06-29T10:00:00","text":"version corrigee (editee)"}']);

            $res = tg_aggregate_source($pdo, $source, 'live', null, null);

            // Un seul document malgré les 2 lignes de buffer.
            $this->assertSame(1, $res['documents']);
            $count = $pdo->query("SELECT COUNT(*) FROM documents WHERE lot_id = " . $pdo->quote($res['lot_id']))->fetchColumn();
            $this->assertSame(1, (int) $count);
            // C'est la dernière version (édition) qui est conservée.
            $contenu = $pdo->query("SELECT contenu_brut FROM documents WHERE lot_id = " . $pdo->quote($res['lot_id']))->fetchColumn();
            $this->assertSame('version corrigee (editee)', $contenu);
            // Les 2 lignes de buffer sont consommées (pas de résidu 'buffered').
            $reste = $pdo->query("SELECT COUNT(*) FROM telegram_updates_buffer WHERE message_id=500 AND buffer_status='buffered'")->fetchColumn();
            $this->assertSame(0, (int) $reste);
        } finally {
            $pdo->rollBack();
        }
    }

    // --- tg_entities_to_markdown() ---

    public function testEntitiesSimpleBold(): void
    {
        // "Hello world" avec bold sur "world" (offset=6, length=5, UTF-16)
        $entities = [['type' => 'bold', 'offset' => 6, 'length' => 5]];
        $result = tg_entities_to_markdown('Hello world', $entities);
        $this->assertSame('Hello **world**', $result);
    }

    public function testEntitiesItalic(): void
    {
        $entities = [['type' => 'italic', 'offset' => 0, 'length' => 4]];
        $result = tg_entities_to_markdown('stop maintenant', $entities);
        $this->assertSame('_stop_ maintenant', $result);
    }

    public function testEntitiesUnderline(): void
    {
        $entities = [['type' => 'underline', 'offset' => 0, 'length' => 3]];
        $result = tg_entities_to_markdown('abc def', $entities);
        $this->assertSame('<u>abc</u> def', $result);
    }

    public function testEntitiesEmojiOffset(): void
    {
        // "🕊 bold" — emoji 🕊 = 2 UTF-16 units, donc bold commence à offset 3 (2 + space)
        $entities = [['type' => 'bold', 'offset' => 3, 'length' => 4]];
        $result = tg_entities_to_markdown('🕊 bold', $entities);
        $this->assertSame('🕊 **bold**', $result);
    }

    public function testEntitiesEmpty(): void
    {
        $result = tg_entities_to_markdown('texte sans entité', []);
        $this->assertSame('texte sans entité', $result);
    }

    public function testEntitiesUnknownTypeIgnored(): void
    {
        // hashtag et url ignorés (pas de formatage inline)
        $entities = [['type' => 'hashtag', 'offset' => 0, 'length' => 4]];
        $result = tg_entities_to_markdown('#tag texte', $entities);
        $this->assertSame('#tag texte', $result);
    }

    /**
     * Régression : l'œuvre cible configurée sur la source (collect_sources.oeuvre_id)
     * doit être propagée aux documents du lot, pour pré-remplir l'atelier.
     */
    public function testAggregatePropagatesSourceOeuvreToDocuments(): void
    {
        $pdo = \Tests\Dal\TestHelper::getTestPdo();
        $pdo->beginTransaction();
        try {
            // Auteur + œuvre cible
            $pdo->prepare("INSERT INTO auteurs (nom) VALUES ('Lulumineuse')")->execute();
            $auteurId = (int) $pdo->lastInsertId();
            $pdo->prepare("INSERT INTO oeuvres (auteur_id, nom, abreviation) VALUES (?, 'Telegram', 'TgLulu')")
                ->execute([$auteurId]);
            $oeuvreId = (int) $pdo->lastInsertId();

            // Source telegram liée à l'œuvre
            $pdo->prepare("INSERT INTO collect_sources (source_type, nom, enabled, oeuvre_id)
                           VALUES ('telegram','Canal Test',1,?)")->execute([$oeuvreId]);
            $sourceId = (int) $pdo->lastInsertId();
            $source = $pdo->query("SELECT * FROM collect_sources WHERE id=$sourceId")->fetch();

            $ins = $pdo->prepare("INSERT INTO telegram_updates_buffer
                (collect_source_id, origin, update_id, message_id, chat_id, message_date, buffer_status, payload_json)
                VALUES (?,?,?,?,?,?, 'buffered', ?)");
            $ins->execute([$sourceId,'live',1,101,-100,'2026-06-22 10:00:00','{"message_id":101,"date":"2026-06-22T10:00:00","text":"a"}']);
            $ins->execute([$sourceId,'live',2,102,-100,'2026-06-23 10:00:00','{"message_id":102,"date":"2026-06-23T10:00:00","text":"b"}']);

            $res = tg_aggregate_source($pdo, $source, 'live', null, null);

            $this->assertSame(2, $res['documents']);
            // Tous les documents du lot portent l'œuvre de la source.
            $stmt = $pdo->prepare("SELECT oeuvre_id FROM documents WHERE lot_id = ?");
            $stmt->execute([$res['lot_id']]);
            $oeuvreIds = $stmt->fetchAll(\PDO::FETCH_COLUMN);
            $this->assertCount(2, $oeuvreIds);
            foreach ($oeuvreIds as $got) {
                $this->assertSame($oeuvreId, (int) $got);
            }
        } finally {
            $pdo->rollBack();
        }
    }
}
