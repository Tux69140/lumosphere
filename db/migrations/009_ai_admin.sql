-- Lumosphere — Migration 009 : tables IA admin
-- ia_settings (config provider/modèle), ai_prompts (prompts éditables), ai_logs (journal enrichi)

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;

-- ======== ia_settings ========
CREATE TABLE IF NOT EXISTS ia_settings (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    scope           VARCHAR(50) NOT NULL DEFAULT 'server_default',
    provider        VARCHAR(50) NOT NULL,
    model           VARCHAR(255) NOT NULL,
    timeout_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 45,
    max_retries     TINYINT UNSIGNED NOT NULL DEFAULT 2,
    updated_by      INT UNSIGNED NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ia_settings_scope (scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

INSERT IGNORE INTO ia_settings (scope, provider, model)
VALUES ('server_default', 'mistral', 'mistral-small-latest');

-- ======== ai_prompts ========
CREATE TABLE IF NOT EXISTS ai_prompts (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    prompt_key  VARCHAR(50) NOT NULL,
    content     TEXT NOT NULL,
    updated_by  INT UNSIGNED NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ai_prompts_key (prompt_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

INSERT IGNORE INTO ai_prompts (prompt_key, content) VALUES
('suggest_keywords', 'Tu es un assistant éditorial. Voici une citation :\n\n---\n{contenu}\n---\n\nMots-clés déjà existants dans la base (utilise-les en priorité si pertinents) :\n{kw_list}\n\nPropose jusqu''à 5 mots-clés pertinents pour indexer cette citation.\nRéponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balise markdown :\n{"keywords": ["mot1", "mot2"]}'),
('suggest_theme', 'Tu es un assistant éditorial. Voici une citation :\n\n---\n{contenu}\n---\n\nListe des thèmes disponibles :\n{themes_list}\n\nQuel thème correspond le mieux à cette citation ?\nRéponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balise markdown :\n{"theme_id": <id du thème>}');

-- ======== ai_logs (create or alter) ========
CREATE TABLE IF NOT EXISTS ai_logs (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
    provider          VARCHAR(50) NOT NULL DEFAULT '',
    model             VARCHAR(255) NOT NULL DEFAULT '',
    action            VARCHAR(50) NOT NULL DEFAULT '',
    prompt_tokens     INT UNSIGNED NOT NULL DEFAULT 0,
    completion_tokens INT UNSIGNED NOT NULL DEFAULT 0,
    latency_ms        INT UNSIGNED NOT NULL DEFAULT 0,
    status            ENUM('ok','error') NOT NULL DEFAULT 'ok',
    error_message     TEXT NULL,
    user_id           INT UNSIGNED NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ai_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
