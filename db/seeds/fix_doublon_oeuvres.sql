-- db/seeds/fix_doublon_oeuvres.sql
-- One-shot : fusionne les œuvres en doublon (même auteur + même nom).
-- Pour chaque groupe (auteur_id, nom), on garde l'id le plus petit (canonique),
-- on repointe toutes les références vers lui, puis on supprime les doublons.
-- Les FK oeuvres sont ON DELETE RESTRICT : on repointe donc AVANT de supprimer.
-- Exécuter : ssh lumosphere puis mysql mist2786_lumosphere < fix_doublon_oeuvres.sql
-- Idempotent : si aucun doublon, ne fait rien.

START TRANSACTION;

-- Correspondance doublon -> id canonique (le plus petit du groupe).
CREATE TEMPORARY TABLE oeuvre_dupes AS
SELECT o.id AS dup_id,
       (SELECT MIN(o2.id) FROM oeuvres o2
         WHERE o2.auteur_id = o.auteur_id AND o2.nom = o.nom) AS keep_id
FROM oeuvres o;

-- Ne conserver que les vraies redirections (dup ≠ canonique).
DELETE FROM oeuvre_dupes WHERE dup_id = keep_id;

-- Repointer toutes les références (y compris soft-deleted, sinon la FK bloque la suppression).
UPDATE citations c       JOIN oeuvre_dupes d ON c.oeuvre_id  = d.dup_id SET c.oeuvre_id  = d.keep_id;
UPDATE collect_sources s JOIN oeuvre_dupes d ON s.oeuvre_id  = d.dup_id SET s.oeuvre_id  = d.keep_id;
UPDATE documents doc     JOIN oeuvre_dupes d ON doc.oeuvre_id = d.dup_id SET doc.oeuvre_id = d.keep_id;

-- Supprimer les doublons désormais sans référence.
DELETE o FROM oeuvres o JOIN oeuvre_dupes d ON o.id = d.dup_id;

DROP TEMPORARY TABLE oeuvre_dupes;

COMMIT;
