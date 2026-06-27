-- db/config/mariadb_fulltext_config.sql
-- Configuration FULLTEXT MariaDB pour Lumosphère (T11).
-- À exécuter une fois sur le serveur avec un utilisateur disposant des pleins droits.
-- Ré-exécuter + OPTIMIZE TABLE citations après tout redéploiement sur un nouveau serveur.

SET GLOBAL innodb_ft_min_token_size = 2;    -- mots courts : IA, âme, OM…
SET GLOBAL innodb_ft_enable_stopword = OFF; -- aucun mot filtré silencieusement

OPTIMIZE TABLE citations; -- reconstruit l'index FULLTEXT avec les nouveaux réglages
