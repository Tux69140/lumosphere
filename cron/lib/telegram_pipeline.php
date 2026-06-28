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
