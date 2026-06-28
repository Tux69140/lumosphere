-- Verification 009 : IA admin tables
SELECT 'ia_settings' AS tbl, COUNT(*) AS cnt FROM ia_settings;
SELECT 'ai_prompts' AS tbl, COUNT(*) AS cnt FROM ai_prompts;
SHOW CREATE TABLE ai_logs;
