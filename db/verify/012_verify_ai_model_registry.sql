-- Vérification migration 012 : registre des modèles IA
-- ⚠ Dans phpMyAdmin : sélectionner d'abord la base lumosphere dans le panneau gauche,
--    PUIS exécuter ce script.

-- 1. Diagnostic : affiche la base active. Doit afficher le nom de la base, PAS null.
SELECT DATABASE() AS base_active;

-- 2. Tables créées
SHOW TABLES LIKE 'ia_model_catalog_cache';
SHOW TABLES LIKE 'ia_model_registry';

-- 3. Colonnes ajoutées à ia_model_registry
SHOW COLUMNS FROM ia_model_registry LIKE 'context_window';
SHOW COLUMNS FROM ia_model_registry LIKE 'supports_json';
SHOW COLUMNS FROM ia_model_registry LIKE 'supports_vision';
SHOW COLUMNS FROM ia_model_registry LIKE 'deprecated';

-- 4. Colonnes ajoutées à ai_logs
SHOW COLUMNS FROM ai_logs LIKE 'error_type';
SHOW COLUMNS FROM ai_logs LIKE 'error_origin';

-- 5. Index
SHOW INDEX FROM ia_model_registry WHERE Key_name = 'idx_registry_enabled';
