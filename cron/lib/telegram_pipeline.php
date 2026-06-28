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
