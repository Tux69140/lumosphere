-- Doit renvoyer 2 lignes à 1 : colonne theme_suggested_id présente,
-- et enum source réduit à (manual, ai_suggested) sans ai_accepted.
SELECT 'documents.theme_suggested_id' AS check_name, COUNT(*) AS ok
  FROM information_schema.columns
 WHERE table_name='documents' AND column_name='theme_suggested_id'
UNION ALL
SELECT 'ldk.source_sans_ai_accepted',
       CASE WHEN COUNT(*)=1 AND LOCATE('ai_accepted', column_type)=0 THEN 1 ELSE 0 END
  FROM information_schema.columns
 WHERE table_name='lot_document_keywords' AND column_name='source';
