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
