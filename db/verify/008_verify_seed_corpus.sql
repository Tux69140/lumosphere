-- db/verify/008_verify_seed_corpus.sql
-- Vérification post-seed T10 : compter et contrôler les données de test corpus.
-- Usage : mysql mist2786_lumosphere < db/verify/008_verify_seed_corpus.sql

SELECT '=== T10 SEED CORPUS — VÉRIFICATION ===' AS '';

-- Total citations (hors soft-delete)
SELECT 'Total citations' AS test,
       COUNT(*)          AS valeur,
       '≥ 106'           AS attendu
FROM citations WHERE deleted_at IS NULL;

-- Œuvres de Lulumineuse
SELECT 'Œuvres Lulumineuse' AS test,
       COUNT(*)              AS valeur,
       '7'                   AS attendu
FROM oeuvres o
JOIN auteurs a ON o.auteur_id = a.id
WHERE a.nom = 'Lulumineuse';

-- Répartition par état
SELECT 'Citations par état' AS test,
       e.nom                AS detail,
       COUNT(*)             AS valeur
FROM citations c
JOIN etats e ON c.etat_id = e.id
WHERE c.deleted_at IS NULL
GROUP BY e.nom
ORDER BY valeur DESC;

-- Citations sans mots-clés (attendu : 0)
SELECT 'Citations sans mots-clés' AS test,
       COUNT(*)                    AS valeur,
       '0'                         AS attendu
FROM citations c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM citation_keywords ck WHERE ck.citation_id = c.id);

-- Total lignes citation_keywords
SELECT 'Lignes citation_keywords' AS test,
       COUNT(*)                    AS valeur,
       '≥ 200 (2 min par citation)' AS attendu
FROM citation_keywords;

-- Citations générées seed-test-*
SELECT 'Citations seed-test-*' AS test,
       COUNT(*)                 AS valeur,
       '100'                    AS attendu
FROM citations
WHERE source_item_id LIKE 'seed-test-%';

-- TEST FULLTEXT accent-insensible : 'ame' doit remonter des citations contenant 'âme'
SELECT 'FULLTEXT : ame → âme' AS test,
       COUNT(*)                AS valeur,
       '> 0'                   AS attendu
FROM citations
WHERE MATCH(contenu, notes, auteur_nom) AGAINST('ame' IN BOOLEAN MODE)
  AND contenu LIKE '%âme%'
  AND deleted_at IS NULL;

-- Œuvres présentes dans les citations générées (doit afficher les 7)
SELECT 'Œuvres dans citations générées' AS test,
       o.nom                             AS oeuvre,
       COUNT(c.id)                       AS nb_citations
FROM citations c
JOIN oeuvres o ON c.oeuvre_id = o.id
WHERE c.source_item_id LIKE 'seed-test-%'
GROUP BY o.nom
ORDER BY nb_citations DESC;
