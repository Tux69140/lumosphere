-- Doit renvoyer 2 lignes (origin, history_import_enabled présents)
SELECT 'buffer.origin' AS check_name, COUNT(*) AS ok
  FROM information_schema.columns
 WHERE table_name='telegram_updates_buffer' AND column_name='origin'
UNION ALL
SELECT 'sources.history_import_enabled', COUNT(*)
  FROM information_schema.columns
 WHERE table_name='collect_sources' AND column_name='history_import_enabled';
