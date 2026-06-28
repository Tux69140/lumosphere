-- Lumosphère — Vérification migration 010

-- 1) lots.status a 8 valeurs
SELECT COLUMN_TYPE FROM information_schema.COLUMNS
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'lots' AND column_name = 'status';
-- Attendu : enum('en_attente','en_cours','en_traitement','en_revision','a_reprendre','pret','integre','erreur')

-- 2) lots.assigned_to est INT UNSIGNED avec FK vers users
SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'lots' AND column_name = 'assigned_to';
-- Attendu : int(10) unsigned, YES

-- 3) lots a les nouvelles colonnes
SELECT column_name FROM information_schema.COLUMNS
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'lots'
  AND column_name IN ('created_by','description','error_message','integrated_at')
ORDER BY column_name;
-- Attendu : 4 lignes

-- 4) documents a les nouvelles colonnes
SELECT column_name FROM information_schema.COLUMNS
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'documents'
  AND column_name IN ('source_item_id','contenu_brut','contenu_revise','hash_contenu','selected','theme_id','oeuvre_id','citation_id')
ORDER BY column_name;
-- Attendu : 8 lignes

-- 5) documents.type_document n'a plus les anciennes valeurs
SELECT COLUMN_TYPE FROM information_schema.COLUMNS
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'documents' AND column_name = 'type_document';
-- Attendu : enum('pdf','telegram','youtube','html')

-- 6) lot_document_keywords existe
SELECT COUNT(*) AS table_exists FROM information_schema.TABLES
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'lot_document_keywords';
-- Attendu : 1

-- 7) citations.lot_origin_id existe avec FK
SELECT COLUMN_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'citations'
  AND column_name = 'lot_origin_id';
-- Attendu : lot_origin_id → lots

-- 8) journal_events.actor_id existe
SELECT column_name FROM information_schema.COLUMNS
WHERE table_schema = 'mist2786_lumosphere'
  AND table_name = 'journal_events'
  AND column_name = 'actor_id';
-- Attendu : 1 ligne

-- 9) schema_version
SELECT * FROM schema_version WHERE version = 10;
-- Attendu : 1 ligne
