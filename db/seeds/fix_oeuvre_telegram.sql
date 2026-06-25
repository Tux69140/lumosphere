-- db/seeds/fix_oeuvre_telegram.sql
-- One-shot : réassigner les 6 vraies citations de "Telegram Lulumineuse" vers "Telegram"
-- et supprimer l'ancienne oeuvre.
-- Contexte : le seed T10 a renommé l'oeuvre en "Telegram" mais l'ancienne existait déjà en base.
-- Exécuter : ssh lumosphere puis mysql mist2786_lumosphere < fix_oeuvre_telegram.sql

START TRANSACTION;

-- Réassigner les citations qui pointent vers "Telegram Lulumineuse"
UPDATE citations
SET oeuvre_id = (SELECT id FROM oeuvres WHERE nom = 'Telegram')
WHERE oeuvre_id = (SELECT id FROM oeuvres WHERE nom = 'Telegram Lulumineuse')
  AND deleted_at IS NULL;

-- Supprimer l'ancienne oeuvre (maintenant sans citations)
DELETE FROM oeuvres WHERE nom = 'Telegram Lulumineuse';

COMMIT;
