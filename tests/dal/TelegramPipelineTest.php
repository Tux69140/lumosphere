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
}
