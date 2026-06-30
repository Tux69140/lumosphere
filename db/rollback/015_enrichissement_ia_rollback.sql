SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;
-- Restaure l'état 'ai_accepted' puis supprime la case « thème suggéré ».
ALTER TABLE lot_document_keywords
    MODIFY COLUMN source ENUM('manual','ai_suggested','ai_accepted') NOT NULL DEFAULT 'manual';
ALTER TABLE documents
    DROP FOREIGN KEY fk_documents_theme_suggested,
    DROP COLUMN theme_suggested_id;
DELETE FROM schema_version WHERE version = 15;
