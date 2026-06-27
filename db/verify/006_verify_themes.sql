-- ─────────────────────────────────────────────────────────────────────
-- VERIFY 006 — Contrôle du seed thèmes
-- Toutes les colonnes "résultat" doivent afficher 1 (TRUE)
-- ─────────────────────────────────────────────────────────────────────
SELECT COUNT(*) = 16  AS '16 thèmes au total'       FROM themes;
SELECT COUNT(*) = 4   AS '4 thèmes racine'           FROM themes WHERE parent_id IS NULL;
SELECT COUNT(*) = 12  AS '12 sous-thèmes'            FROM themes WHERE parent_id IS NOT NULL;
SELECT COUNT(*) = 0   AS 'Aucun chemin NULL'          FROM themes WHERE chemin IS NULL OR chemin = '';
SELECT COUNT(*) = 12  AS '12 chemins avec /'          FROM themes WHERE chemin LIKE '%/%';
SELECT COUNT(*) = 4   AS '4 chemins sans / (racine)'  FROM themes WHERE chemin NOT LIKE '%/%';
SELECT COUNT(*) = 0   AS 'Pas de niveau 3'
  FROM themes
  WHERE parent_id IN (SELECT id FROM themes WHERE parent_id IS NOT NULL);
SELECT COUNT(*) = 1   AS 'Thème 1 correct'
  FROM themes WHERE id = 1 AND nom = 'Chemin et relation à Dieu' AND parent_id IS NULL;
SELECT COUNT(*) = 1   AS 'Sous-thème 6 correct'
  FROM themes WHERE id = 6 AND parent_id = 1 AND nom = 'Foi et prière';
