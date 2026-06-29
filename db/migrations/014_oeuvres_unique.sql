-- Lumosphère — Migration 014 : unicité des œuvres (auteur_id, nom)
-- Empêche définitivement les œuvres en doublon (ex. deux « Telegram » du même auteur).
-- PRÉ-REQUIS : exécuter d'abord db/seeds/fix_doublon_oeuvres.sql, sinon l'ALTER échoue
-- (l'index UNIQUE refuse de se créer s'il reste des doublons).
-- Cible : MariaDB 11.4.12 (o2switch), base mist2786_lumosphere
-- Le compte SSH n'a pas les droits DDL : appliquer cet ALTER via phpMyAdmin (cPanel).

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;

ALTER TABLE oeuvres
  ADD UNIQUE KEY uq_oeuvres_auteur_nom (auteur_id, nom);

-- Fin migration 014.
