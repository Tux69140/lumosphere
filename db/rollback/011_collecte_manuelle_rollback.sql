SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE telegram_updates_buffer DROP KEY idx_tub_origin, DROP COLUMN origin;
ALTER TABLE collect_sources DROP COLUMN history_import_enabled;
DELETE FROM schema_version WHERE version = 11;
