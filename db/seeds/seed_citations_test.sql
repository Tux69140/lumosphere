-- db/seeds/seed_citations_test.sql
-- Seed T08 : 6 citations réelles depuis les lots Telegram exportés.
-- Exécuter sur le serveur : ssh lumosphere, puis mysql mist2786_lumosphere < seed_citations_test.sql
-- Idempotent : vérifie l'absence avant insertion.

START TRANSACTION;

-- 1. Auteur
INSERT INTO auteurs (nom, site)
SELECT 'Lulumineuse', 'https://lulumineuse.com'
WHERE NOT EXISTS (SELECT 1 FROM auteurs WHERE nom = 'Lulumineuse');

SET @auteur_id = (SELECT id FROM auteurs WHERE nom = 'Lulumineuse');

-- 2. Œuvre
INSERT INTO oeuvres (auteur_id, nom, abreviation)
SELECT @auteur_id, 'Telegram Lulumineuse', 'TgLulu'
WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = 'Telegram Lulumineuse');

SET @oeuvre_id = (SELECT id FROM oeuvres WHERE nom = 'Telegram Lulumineuse');

-- 3. État par défaut
SET @etat_id = (SELECT id FROM etats WHERE nom = 'À Corriger');

-- 4. Citations (6 segments des lots exportés)

-- Citation 1 — lot telegram_20260614_001, msg 6978
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Chers amis, chaque mois je diffuse un audio pour accompagner les donateurs du cercle des abonnés du site Lulumineuse.com (qui permettent la mise à disposition de nombreuses ressources au quotidien) à traverser les énergies et influences du mois/Moi et d''en extraire la sagesse et la profondeur.\nLa sécurité intérieure est une grande question que l''humanité devra résoudre par la migration de sa conscience, traversant des épreuves qui n''auront de cesse de l''inviter à sonder son propre monde intérieur.\nCet audio est à mon sens précieux à écouter et à saisir pour les temps actuels et ceux à venir très prochainement. (Il vous suffit de cliquer sur l''image pour l''écouter)',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_id,
  'Lulumineuse',
  '6978',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '6978');

-- Citation 2 — lot telegram_20260614_002, msg 6979
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Élan d''âme, café et prière : Lulumineuse.com doit rester complet.',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_id,
  'Lulumineuse',
  '6979',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '6979');

-- Citation 3 — lot telegram_20260614_003, msg 7
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Message de test du 14/06/26, par Stéphane. Comment le lien vas-t-il être géré ? Comment le mot-clé vas-t-il être géré ?\n\nLiens: https://www.biovibralyon.fr/',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_id,
  'Lulumineuse',
  '7',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '7');

-- Citation 4 — lot telegram_20260614_004, msg 8
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Message N°2 du 14/06. Avec un lien. et un mot clé\n\nLiens: https://www.google.fr/',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_id,
  'Lulumineuse',
  '8',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '8');

-- Citation 5 — lot telegram_20260614_005, msg 9
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Test N°3 du 14/06 sans lien',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_id,
  'Lulumineuse',
  '9',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '9');

-- Citation 6 — lot telegram_20260614_006, msg 10
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Dieu est juste. Suivons notre instinct.',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_id,
  'Lulumineuse',
  '10',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '10');

-- 5. Mots-clés (insert ignore pour idempotence)
INSERT IGNORE INTO keywords (mot) VALUES
  ('Sécurité intérieure'), ('Épreuves'), ('Sagesse'),
  ('Conscience'), ('Migration spirituelle'), ('Ressources'), ('Audio guidé'),
  ('Spiritualité'), ('Café'), ('Prière'), ('Inspiration'), ('Bien-être'), ('Communauté'),
  ('Lien'), ('Test'), ('Gestion'), ('Biovibralyon'), ('Message'),
  ('Mot-clé'), ('Dieu'), ('Divin'),
  ('Seigneur'), ('Parole'), ('Révélation'), ('Enseignement spirituel'), ('Guidance'),
  ('Justice divine'), ('Intuition spirituelle'), ('Confiance intérieure');

-- 6. Liaisons citation ↔ mots-clés
-- Citation 1 (msg 6978)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '6978'
  AND k.mot IN ('Sécurité intérieure', 'Épreuves', 'Sagesse', 'Conscience', 'Migration spirituelle', 'Ressources', 'Audio guidé');

-- Citation 2 (msg 6979)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '6979'
  AND k.mot IN ('Spiritualité', 'Café', 'Prière', 'Inspiration', 'Bien-être', 'Communauté');

-- Citation 3 (msg 7)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '7'
  AND k.mot IN ('Lien', 'Test', 'Gestion', 'Biovibralyon', 'Message');

-- Citation 4 (msg 8)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '8'
  AND k.mot IN ('Mot-clé', 'Dieu', 'Message', 'Divin', 'Seigneur', 'Parole', 'Révélation', 'Enseignement spirituel', 'Guidance');

-- Citation 5 (msg 9)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '9'
  AND k.mot IN ('Lien');

-- Citation 6 (msg 10)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '10'
  AND k.mot IN ('Dieu', 'Justice divine', 'Intuition spirituelle', 'Confiance intérieure');

COMMIT;
