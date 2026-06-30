-- Lumosphère — Vérification migration 018
-- Coller dans phpMyAdmin (onglet SQL) sur la base mist2786_lumosphere
-- Chaque requête doit retourner la valeur attendue indiquée en commentaire

-- 1) Colonne password_set_at présente dans users
SELECT column_name, column_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'mist2786_lumosphere'
   AND table_name   = 'users'
   AND column_name  = 'password_set_at';
-- Attendu : 1 ligne — datetime, YES

-- 2) Table password_tokens existe
SELECT COUNT(*) AS table_exists
  FROM information_schema.tables
 WHERE table_schema = 'mist2786_lumosphere'
   AND table_name   = 'password_tokens';
-- Attendu : 1

-- 3) Table password_reset_attempts existe
SELECT COUNT(*) AS table_exists
  FROM information_schema.tables
 WHERE table_schema = 'mist2786_lumosphere'
   AND table_name   = 'password_reset_attempts';
-- Attendu : 1

-- 4) Clé étrangère fk_pt_user (password_tokens → users)
SELECT constraint_name, referenced_table_name, delete_rule
  FROM information_schema.referential_constraints
 WHERE constraint_schema = 'mist2786_lumosphere'
   AND constraint_name   = 'fk_pt_user';
-- Attendu : fk_pt_user → users, CASCADE

-- 5) Index unique sur token_hash
SELECT index_name, non_unique
  FROM information_schema.statistics
 WHERE table_schema = 'mist2786_lumosphere'
   AND table_name   = 'password_tokens'
   AND index_name   = 'uq_token_hash';
-- Attendu : uq_token_hash, 0 (unique)
