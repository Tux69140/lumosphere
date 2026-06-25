-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ GÉNÉRÉ par db/seeds/generate_citations.py (SEED=42, N=100)              │
-- │ NE PAS MODIFIER — régénérer :                                           │
-- │   python3 db/seeds/generate_citations.py > db/seeds/seed_citations_generated.sql │
-- └──────────────────────────────────────────────────────────────────────────┘

START TRANSACTION;

-- 1. Auteur
INSERT INTO auteurs (nom, site)
SELECT 'Lulumineuse', 'https://lulumineuse.com'
WHERE NOT EXISTS (SELECT 1 FROM auteurs WHERE nom = 'Lulumineuse');
SET @auteur_gen = (SELECT id FROM auteurs WHERE nom = 'Lulumineuse');

-- 2. Œuvres (7 canoniques)
INSERT INTO oeuvres (auteur_id, nom, abreviation)
SELECT @auteur_gen, 'Telegram', 'TgLulu'
WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = 'Telegram');
SET @oeuvre_tglulu = (SELECT id FROM oeuvres WHERE nom = 'Telegram');
INSERT INTO oeuvres (auteur_id, nom, abreviation)
SELECT @auteur_gen, 'ebook', 'EbkLulu'
WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = 'ebook');
SET @oeuvre_ebklulu = (SELECT id FROM oeuvres WHERE nom = 'ebook');
INSERT INTO oeuvres (auteur_id, nom, abreviation)
SELECT @auteur_gen, 'Directs', 'DirLulu'
WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = 'Directs');
SET @oeuvre_dirlulu = (SELECT id FROM oeuvres WHERE nom = 'Directs');
INSERT INTO oeuvres (auteur_id, nom, abreviation)
SELECT @auteur_gen, 'Guidance', 'GdnLulu'
WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = 'Guidance');
SET @oeuvre_gdnlulu = (SELECT id FROM oeuvres WHERE nom = 'Guidance');
INSERT INTO oeuvres (auteur_id, nom, abreviation)
SELECT @auteur_gen, 'Pratique', 'PrtLulu'
WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = 'Pratique');
SET @oeuvre_prtlulu = (SELECT id FROM oeuvres WHERE nom = 'Pratique');
INSERT INTO oeuvres (auteur_id, nom, abreviation)
SELECT @auteur_gen, 'Atelier', 'AtlLulu'
WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = 'Atelier');
SET @oeuvre_atllulu = (SELECT id FROM oeuvres WHERE nom = 'Atelier');
INSERT INTO oeuvres (auteur_id, nom, abreviation)
SELECT @auteur_gen, 'Articles', 'ArtLulu'
WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = 'Articles');
SET @oeuvre_artlulu = (SELECT id FROM oeuvres WHERE nom = 'Articles');

-- 3. Mots-clés
INSERT IGNORE INTO keywords (mot) VALUES
  ('Dieu'),
  ('âme'),
  ('prière'),
  ('lumière'),
  ('pardon'),
  ('grâce'),
  ('conscience'),
  ('méditation'),
  ('foi'),
  ('présence'),
  ('paix'),
  ('cœur'),
  ('silence'),
  ('vérité'),
  ('amour'),
  ('esprit'),
  ('sagesse'),
  ('lâcher-prise'),
  ('gratitude'),
  ('service');

-- 4. Variables états
SET @etat_publiee  = (SELECT id FROM etats WHERE nom = 'Publiée');
SET @etat_corriger = (SELECT id FROM etats WHERE nom = 'À Corriger');
SET @etat_reviser  = (SELECT id FROM etats WHERE nom = 'À Réviser');

-- 5. Citations générées (idempotentes via source_item_id)
-- [001] seed-test-0001
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu embrasse le chemin vers la lumière en chaque instant de la vie. L''amour guérit l''espace du cœur et invite à la gratitude. La vérité intérieure touche en profondeur la relation à la Source au-delà de toute souffrance.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0001',
  '2026-01-23'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0001' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0001' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [002] seed-test-0002
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu guérit notre monde intérieur en chaque instant de la vie.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0002',
  '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0002' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0002' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [003] seed-test-0003
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur révèle la relation à la Source et ouvre la porte du pardon.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0003',
  '2026-04-12'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0003' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0003' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [004] seed-test-0004
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le silence transforme les liens qui nous unissent là où le mental s''efface.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0004',
  '2026-01-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0004' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0004' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [005] seed-test-0005
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine révèle les zones d''ombre en nous si l''on accepte de lâcher-prise. Chaque être libère le silence sacré et ouvre la porte du pardon. Chaque être touche en profondeur le chemin vers la lumière et invite à la gratitude.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0005',
  '2026-01-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0005' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0005' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [006] seed-test-0006
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur invite à découvrir la relation à la Source dans la douceur du présent.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0006',
  '2026-04-01'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0006' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0006' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [007] seed-test-0007
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit touche en profondeur la vérité de notre nature et révèle la beauté de l''existence.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Lois universelles et plans de conscience'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0007',
  '2026-03-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0007' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0007' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [008] seed-test-0008
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu transforme les profondeurs de l''être au-delà de toute souffrance. Le chemin intérieur appelle vers la profondeur du souffle avec une infinie tendresse.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0008',
  '2026-05-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0008' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0008' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [009] seed-test-0009
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour accompagne le chemin vers la lumière au-delà de toute souffrance.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0009',
  '2026-05-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0009' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0009' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

-- [010] seed-test-0010
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce habite la relation à la Source si l''on accepte de lâcher-prise. La paix intérieure élève la vérité de notre nature si l''on accepte de lâcher-prise. Chaque être habite la profondeur du souffle et ouvre la porte du pardon.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0010',
  '2026-05-19'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0010' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0010' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [011] seed-test-0011
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse élève la profondeur du souffle là où le mental s''efface. La prière libère l''espace du cœur si l''on accepte de lâcher-prise. Le cœur embrasse le silence sacré avec une infinie tendresse. La foi appelle vers les profondeurs de l''être avec une infinie tendresse.\n\nLe silence élève notre dimension invisible et ouvre la porte du pardon. Le silence touche en profondeur les zones d''ombre en nous si l''on accepte de lâcher-prise. La foi purifie l''harmonie universelle là où le mental s''efface.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0011',
  '2026-06-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0011' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0011' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [012] seed-test-0012
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière révèle le silence sacré si l''on accepte de lâcher-prise. La lumière illumine l''espace du cœur quand on s''y abandonne avec foi.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0012',
  '2026-02-24'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0012' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0012' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [013] seed-test-0013
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le silence guérit la profondeur du souffle quand on s''y abandonne avec foi. La miséricorde transforme le silence sacré là où le mental s''efface.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0013',
  '2026-02-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0013' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0013' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [014] seed-test-0014
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière traverse la relation à la Source en chaque instant de la vie. Le silence traverse l''appel de la conscience avec une infinie tendresse. L''esprit élève la profondeur du souffle en chaque instant de la vie.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0014',
  '2026-02-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0014' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0014' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

-- [015] seed-test-0015
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour nourrit les zones d''ombre en nous et ouvre la porte du pardon. La paix intérieure transforme le silence sacré et révèle la beauté de l''existence. L''amour purifie le silence sacré et révèle la beauté de l''existence.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0015',
  '2026-02-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0015' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0015' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [016] seed-test-0016
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu nourrit le silence sacré et ouvre la porte du pardon.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0016',
  '2026-03-21'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0016' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0016' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [017] seed-test-0017
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse ouvre les résistances de l''ego si l''on accepte de lâcher-prise. La lumière apaise les résistances de l''ego dans la douceur du présent.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0017',
  '2026-03-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0017' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0017' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;

-- [018] seed-test-0018
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière révèle les profondeurs de l''être avec une infinie tendresse. La miséricorde purifie l''espace du cœur dans la douceur du présent. La prière habite les résistances de l''ego là où le mental s''efface.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0018',
  '2026-01-24'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0018' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0018' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [019] seed-test-0019
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La paix intérieure rayonne vers notre monde intérieur quand on s''y abandonne avec foi. La grâce révèle la vérité de notre nature dans la douceur du présent. Le cœur rayonne vers les liens qui nous unissent avec une infinie tendresse.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0019',
  '2026-03-10'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0019' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0019' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [020] seed-test-0020
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu habite la vibration de l''amour et révèle la beauté de l''existence.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0020',
  '2026-02-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0020' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0020' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [021] seed-test-0021
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière libère la vérité de notre nature si l''on accepte de lâcher-prise. L''amour purifie les zones d''ombre en nous et invite à la gratitude. La lumière libère la vibration de l''amour au-delà de toute souffrance.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0021',
  '2026-01-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0021' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0021' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [022] seed-test-0022
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour élève la vérité de notre nature et invite à la gratitude. Le silence révèle la relation à la Source quand on s''y abandonne avec foi. La douceur de Dieu embrasse les profondeurs de l''être avec une infinie tendresse.\n\nLe silence embrasse les zones d''ombre en nous et révèle la beauté de l''existence. La douceur de Dieu touche en profondeur les résistances de l''ego là où le mental s''efface.\n\nLe regard de Dieu appelle vers les liens qui nous unissent avec une infinie tendresse. Chaque être ouvre l''harmonie universelle et révèle la beauté de l''existence. Chaque être nourrit l''appel de la conscience en chaque instant de la vie.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0022',
  '2026-03-25'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0022' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0022' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [023] seed-test-0023
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière rayonne vers la relation à la Source si l''on accepte de lâcher-prise.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0023',
  '2026-05-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0023' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0023' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [024] seed-test-0024
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine purifie le chemin vers la lumière dans la douceur du présent. L''esprit habite notre monde intérieur et révèle la beauté de l''existence. L''esprit transforme la relation à la Source dans la douceur du présent.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0024',
  '2026-05-23'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0024' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0024' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [025] seed-test-0025
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience rayonne vers l''appel de la conscience dans la douceur du présent. L''esprit touche en profondeur l''harmonie universelle avec une infinie tendresse.\n\nL''amour invite à découvrir la relation à la Source si l''on accepte de lâcher-prise. L''esprit invite à découvrir les profondeurs de l''être dans la douceur du présent. Le souffle de Dieu accompagne l''harmonie universelle quand on s''y abandonne avec foi. Chaque être élève les résistances de l''ego avec une infinie tendresse.\n\nLa paix intérieure illumine le chemin vers la lumière dans la douceur du présent. La présence divine embrasse les zones d''ombre en nous et invite à la gratitude.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0025',
  '2026-03-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0025' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0025' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [026] seed-test-0026
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse guérit la vibration de l''amour et invite à la gratitude. La miséricorde transforme l''espace du cœur en chaque instant de la vie. La prière transforme l''appel de la conscience et invite à la gratitude.\n\nLa grâce illumine les résistances de l''ego quand on s''y abandonne avec foi. L''amour élève la vibration de l''amour et ouvre la porte du pardon.\n\nLa grâce embrasse l''harmonie universelle si l''on accepte de lâcher-prise. La conscience ouvre les résistances de l''ego au-delà de toute souffrance. Le silence ouvre notre dimension invisible et ouvre la porte du pardon. La vérité intérieure illumine la profondeur du souffle si l''on accepte de lâcher-prise.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0026',
  '2026-04-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0026' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0026' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [027] seed-test-0027
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi apaise l''appel de la conscience au-delà de toute souffrance.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0027',
  '2026-03-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0027' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0027' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [028] seed-test-0028
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit invite à découvrir le chemin vers la lumière dans la douceur du présent. La conscience embrasse l''harmonie universelle quand on s''y abandonne avec foi.\n\nLe cœur appelle vers la vérité de notre nature si l''on accepte de lâcher-prise. Le regard de Dieu touche en profondeur l''appel de la conscience et révèle la beauté de l''existence. Chaque être révèle le silence sacré au-delà de toute souffrance.\n\nLe souffle de Dieu libère le silence sacré et ouvre la porte du pardon. La sagesse embrasse la relation à la Source et révèle la beauté de l''existence. La vérité intérieure accompagne l''espace du cœur et invite à la gratitude.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0028',
  '2026-03-06'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0028' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0028' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [029] seed-test-0029
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu nourrit la profondeur du souffle au-delà de toute souffrance.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0029',
  '2026-05-01'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0029' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0029' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [030] seed-test-0030
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde libère l''harmonie universelle et révèle la beauté de l''existence. Le chemin intérieur embrasse l''appel de la conscience et invite à la gratitude. La prière rayonne vers la relation à la Source dans la douceur du présent.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Lois universelles et plans de conscience'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0030',
  '2026-03-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0030' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0030' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [031] seed-test-0031
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit touche en profondeur l''espace du cœur là où le mental s''efface. Chaque être nourrit notre dimension invisible si l''on accepte de lâcher-prise. L''amour apaise l''harmonie universelle en chaque instant de la vie.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0031',
  '2026-06-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0031' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0031' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [032] seed-test-0032
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure appelle vers les résistances de l''ego si l''on accepte de lâcher-prise. Le silence purifie notre dimension invisible en chaque instant de la vie. La conscience ouvre notre dimension invisible et invite à la gratitude.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0032',
  '2026-02-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0032' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0032' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [033] seed-test-0033
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine invite à découvrir le chemin vers la lumière et invite à la gratitude. La vérité intérieure rayonne vers la vibration de l''amour et révèle la beauté de l''existence. Chaque être habite les zones d''ombre en nous et invite à la gratitude.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0033',
  '2026-04-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0033' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0033' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [034] seed-test-0034
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière transforme les zones d''ombre en nous quand on s''y abandonne avec foi.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0034',
  '2026-03-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0034' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0034' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [035] seed-test-0035
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit libère l''appel de la conscience avec une infinie tendresse.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0035',
  '2026-04-10'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0035' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0035' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [036] seed-test-0036
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce purifie notre dimension invisible et ouvre la porte du pardon.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Lois universelles et plans de conscience'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0036',
  '2026-02-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0036' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0036' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [037] seed-test-0037
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être invite à découvrir notre dimension invisible et invite à la gratitude. L''amour rayonne vers l''harmonie universelle si l''on accepte de lâcher-prise. Chaque être guérit la vérité de notre nature en chaque instant de la vie.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0037',
  '2026-06-19'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0037' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0037' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [038] seed-test-0038
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse élève le chemin vers la lumière et invite à la gratitude. Le cœur rayonne vers les résistances de l''ego au-delà de toute souffrance.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0038',
  '2026-01-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0038' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0038' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [039] seed-test-0039
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière transforme la profondeur du souffle dans la douceur du présent. Le souffle de Dieu nourrit les profondeurs de l''être et ouvre la porte du pardon. L''amour illumine l''appel de la conscience si l''on accepte de lâcher-prise.\n\nLa lumière ouvre la vibration de l''amour avec une infinie tendresse. Chaque être nourrit les zones d''ombre en nous au-delà de toute souffrance. L''esprit invite à découvrir le chemin vers la lumière et révèle la beauté de l''existence. La conscience révèle l''espace du cœur là où le mental s''efface.\n\nLe silence ouvre l''espace du cœur dans la douceur du présent. Le chemin intérieur rayonne vers la vérité de notre nature dans la douceur du présent. La miséricorde transforme la vibration de l''amour et ouvre la porte du pardon. Le souffle de Dieu nourrit l''espace du cœur et ouvre la porte du pardon.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0039',
  '2026-05-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0039' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0039' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [040] seed-test-0040
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce appelle vers l''espace du cœur au-delà de toute souffrance. Le chemin intérieur embrasse l''appel de la conscience et invite à la gratitude.\n\nLa sagesse touche en profondeur les zones d''ombre en nous si l''on accepte de lâcher-prise. Chaque être invite à découvrir le chemin vers la lumière et invite à la gratitude.\n\nLe regard de Dieu libère l''harmonie universelle quand on s''y abandonne avec foi. La foi touche en profondeur les profondeurs de l''être avec une infinie tendresse. L''esprit guérit la relation à la Source et ouvre la porte du pardon. Chaque être apaise la vérité de notre nature quand on s''y abandonne avec foi.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0040',
  '2026-03-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0040' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0040' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [041] seed-test-0041
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être touche en profondeur les zones d''ombre en nous dans la douceur du présent. La grâce appelle vers l''harmonie universelle quand on s''y abandonne avec foi.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0041',
  '2026-03-25'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0041' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0041' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [042] seed-test-0042
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi invite à découvrir le silence sacré quand on s''y abandonne avec foi. Chaque être touche en profondeur la vibration de l''amour là où le mental s''efface. Le souffle de Dieu touche en profondeur l''appel de la conscience avec une infinie tendresse.\n\nChaque être habite le silence sacré en chaque instant de la vie. L''amour accompagne la relation à la Source dans la douceur du présent. La lumière habite l''harmonie universelle et révèle la beauté de l''existence.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0042',
  '2026-04-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0042' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0042' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [043] seed-test-0043
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu habite le silence sacré et ouvre la porte du pardon.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0043',
  '2026-04-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0043' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0043' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [044] seed-test-0044
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière invite à découvrir l''appel de la conscience si l''on accepte de lâcher-prise. Le souffle de Dieu accompagne la vérité de notre nature et ouvre la porte du pardon.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0044',
  '2026-06-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0044' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0044' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [045] seed-test-0045
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu guérit la relation à la Source si l''on accepte de lâcher-prise.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0045',
  '2026-01-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0045' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0045' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [046] seed-test-0046
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le cœur rayonne vers la profondeur du souffle et invite à la gratitude.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0046',
  '2026-01-10'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0046' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0046' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [047] seed-test-0047
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit ouvre les zones d''ombre en nous quand on s''y abandonne avec foi. La prière accompagne les résistances de l''ego en chaque instant de la vie. Le chemin intérieur élève la relation à la Source et révèle la beauté de l''existence. La sagesse embrasse notre dimension invisible et invite à la gratitude.\n\nLa foi touche en profondeur les zones d''ombre en nous et ouvre la porte du pardon. Chaque être traverse les résistances de l''ego si l''on accepte de lâcher-prise. L''esprit nourrit la vibration de l''amour si l''on accepte de lâcher-prise.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0047',
  '2026-04-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0047' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0047' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [048] seed-test-0048
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi rayonne vers les profondeurs de l''être dans la douceur du présent. La sagesse illumine les résistances de l''ego et invite à la gratitude. Le regard de Dieu invite à découvrir le silence sacré si l''on accepte de lâcher-prise. L''amour traverse la relation à la Source en chaque instant de la vie.\n\nLa sagesse élève la vérité de notre nature et ouvre la porte du pardon. La lumière rayonne vers l''appel de la conscience et révèle la beauté de l''existence. La lumière traverse l''harmonie universelle quand on s''y abandonne avec foi. La prière rayonne vers l''espace du cœur dans la douceur du présent.\n\nLa grâce élève l''appel de la conscience avec une infinie tendresse. La conscience appelle vers notre monde intérieur si l''on accepte de lâcher-prise.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0048',
  '2026-03-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0048' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0048' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [049] seed-test-0049
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière élève l''appel de la conscience en chaque instant de la vie. La paix intérieure touche en profondeur l''espace du cœur et ouvre la porte du pardon. La paix intérieure illumine notre dimension invisible avec une infinie tendresse.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0049',
  '2026-03-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0049' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0049' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [050] seed-test-0050
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le silence libère la vibration de l''amour et invite à la gratitude.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0050',
  '2026-03-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0050' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0050' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [051] seed-test-0051
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit apaise les zones d''ombre en nous et invite à la gratitude. La lumière rayonne vers la vibration de l''amour et ouvre la porte du pardon. Le silence libère la profondeur du souffle avec une infinie tendresse.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0051',
  '2026-04-12'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0051' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0051' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [052] seed-test-0052
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur révèle notre dimension invisible et invite à la gratitude. La conscience purifie la vibration de l''amour et révèle la beauté de l''existence.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0052',
  '2026-03-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0052' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0052' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [053] seed-test-0053
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse purifie le chemin vers la lumière et révèle la beauté de l''existence. La prière purifie la vérité de notre nature au-delà de toute souffrance. L''âme transforme l''appel de la conscience là où le mental s''efface.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0053',
  '2026-05-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0053' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0053' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;

-- [054] seed-test-0054
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour habite l''appel de la conscience quand on s''y abandonne avec foi. Le regard de Dieu illumine notre dimension invisible quand on s''y abandonne avec foi.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0054',
  '2026-03-26'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0054' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0054' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [055] seed-test-0055
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''âme traverse l''appel de la conscience en chaque instant de la vie. La vérité intérieure habite les profondeurs de l''être quand on s''y abandonne avec foi.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0055',
  '2026-02-24'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0055' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0055' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [056] seed-test-0056
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience appelle vers les résistances de l''ego et ouvre la porte du pardon. Chaque être appelle vers la relation à la Source au-delà de toute souffrance. La lumière appelle vers notre dimension invisible et révèle la beauté de l''existence.\n\nL''âme transforme la vibration de l''amour dans la douceur du présent. L''esprit apaise la vibration de l''amour et révèle la beauté de l''existence. La prière guérit l''espace du cœur au-delà de toute souffrance. La présence divine guérit les zones d''ombre en nous si l''on accepte de lâcher-prise.\n\nLa vérité intérieure touche en profondeur l''harmonie universelle là où le mental s''efface. La paix intérieure appelle vers notre dimension invisible et révèle la beauté de l''existence. La douceur de Dieu révèle le chemin vers la lumière et ouvre la porte du pardon. La miséricorde purifie les liens qui nous unissent et révèle la beauté de l''existence.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0056',
  '2026-03-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0056' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0056' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [057] seed-test-0057
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu révèle l''espace du cœur si l''on accepte de lâcher-prise.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0057',
  '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0057' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0057' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [058] seed-test-0058
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit apaise l''harmonie universelle là où le mental s''efface. La présence divine touche en profondeur les profondeurs de l''être au-delà de toute souffrance.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0058',
  '2026-03-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0058' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0058' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [059] seed-test-0059
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière rayonne vers les résistances de l''ego si l''on accepte de lâcher-prise. La conscience apaise les résistances de l''ego avec une infinie tendresse. La grâce élève la vérité de notre nature et révèle la beauté de l''existence.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0059',
  '2026-01-12'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0059' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0059' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [060] seed-test-0060
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit touche en profondeur l''appel de la conscience au-delà de toute souffrance.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0060',
  '2026-06-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0060' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0060' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [061] seed-test-0061
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le cœur nourrit l''harmonie universelle si l''on accepte de lâcher-prise. Le souffle de Dieu traverse les profondeurs de l''être quand on s''y abandonne avec foi.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0061',
  '2026-05-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0061' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0061' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [062] seed-test-0062
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu purifie les liens qui nous unissent dans la douceur du présent. Chaque être habite les zones d''ombre en nous là où le mental s''efface.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0062',
  '2026-03-25'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0062' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0062' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [063] seed-test-0063
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu transforme la vérité de notre nature et ouvre la porte du pardon. La sagesse embrasse la vérité de notre nature dans la douceur du présent.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0063',
  '2026-04-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0063' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0063' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [064] seed-test-0064
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit apaise notre dimension invisible au-delà de toute souffrance. Le chemin intérieur appelle vers la vérité de notre nature si l''on accepte de lâcher-prise. La lumière libère les liens qui nous unissent au-delà de toute souffrance.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0064',
  '2026-02-10'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0064' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0064' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [065] seed-test-0065
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu apaise les profondeurs de l''être et révèle la beauté de l''existence. L''esprit ouvre les zones d''ombre en nous dans la douceur du présent. La miséricorde libère notre monde intérieur avec une infinie tendresse.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0065',
  '2026-03-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0065' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0065' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [066] seed-test-0066
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière habite les résistances de l''ego dans la douceur du présent. La vérité intérieure accompagne l''harmonie universelle dans la douceur du présent. La foi apaise les liens qui nous unissent et invite à la gratitude.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0066',
  '2026-05-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0066' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0066' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [067] seed-test-0067
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit accompagne notre monde intérieur et ouvre la porte du pardon. La paix intérieure rayonne vers l''harmonie universelle là où le mental s''efface.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0067',
  '2026-02-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0067' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0067' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;

-- [068] seed-test-0068
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience traverse l''harmonie universelle quand on s''y abandonne avec foi.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0068',
  '2026-02-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0068' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0068' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [069] seed-test-0069
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur embrasse l''appel de la conscience au-delà de toute souffrance. La vérité intérieure embrasse la vérité de notre nature au-delà de toute souffrance.\n\nLe regard de Dieu habite le silence sacré là où le mental s''efface. La présence divine embrasse le chemin vers la lumière et révèle la beauté de l''existence. Chaque être rayonne vers l''appel de la conscience si l''on accepte de lâcher-prise. La vérité intérieure transforme l''espace du cœur avec une infinie tendresse.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0069',
  '2026-04-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0069' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0069' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [070] seed-test-0070
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi guérit la vérité de notre nature et ouvre la porte du pardon.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0070',
  '2026-05-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0070' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0070' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [071] seed-test-0071
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être purifie l''espace du cœur au-delà de toute souffrance.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0071',
  '2026-02-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0071' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0071' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [072] seed-test-0072
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu ouvre les profondeurs de l''être en chaque instant de la vie.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0072',
  '2026-04-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0072' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0072' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [073] seed-test-0073
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi accompagne les liens qui nous unissent là où le mental s''efface.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0073',
  '2026-01-26'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0073' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0073' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [074] seed-test-0074
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde accompagne notre dimension invisible si l''on accepte de lâcher-prise.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0074',
  '2026-06-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0074' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0074' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [075] seed-test-0075
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi accompagne les zones d''ombre en nous au-delà de toute souffrance. La prière rayonne vers notre monde intérieur dans la douceur du présent. Le souffle de Dieu élève la vérité de notre nature avec une infinie tendresse.\n\nL''esprit appelle vers l''espace du cœur et invite à la gratitude. La conscience rayonne vers les zones d''ombre en nous en chaque instant de la vie.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0075',
  '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0075' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0075' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [076] seed-test-0076
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi apaise notre monde intérieur avec une infinie tendresse. La douceur de Dieu transforme la vérité de notre nature là où le mental s''efface.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0076',
  '2026-02-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0076' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0076' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [077] seed-test-0077
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être transforme les liens qui nous unissent là où le mental s''efface. L''amour embrasse les résistances de l''ego si l''on accepte de lâcher-prise. Chaque être libère notre monde intérieur en chaque instant de la vie. La foi invite à découvrir la profondeur du souffle en chaque instant de la vie.\n\nLa vérité intérieure embrasse la vibration de l''amour si l''on accepte de lâcher-prise. La paix intérieure appelle vers notre monde intérieur dans la douceur du présent. Le cœur purifie l''appel de la conscience au-delà de toute souffrance.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0077',
  '2026-03-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0077' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0077' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [078] seed-test-0078
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu apaise notre dimension invisible et ouvre la porte du pardon.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0078',
  '2026-03-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0078' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0078' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [079] seed-test-0079
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience illumine les liens qui nous unissent et invite à la gratitude. La paix intérieure appelle vers l''espace du cœur en chaque instant de la vie. La paix intérieure guérit l''espace du cœur en chaque instant de la vie.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0079',
  '2026-01-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0079' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0079' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [080] seed-test-0080
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur élève l''appel de la conscience et révèle la beauté de l''existence. Chaque être illumine la profondeur du souffle et ouvre la porte du pardon. L''âme nourrit la relation à la Source quand on s''y abandonne avec foi.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0080',
  '2026-05-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0080' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0080' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [081] seed-test-0081
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière libère les liens qui nous unissent au-delà de toute souffrance. Chaque être guérit le chemin vers la lumière et révèle la beauté de l''existence.\n\nLa miséricorde illumine la vérité de notre nature avec une infinie tendresse. La vérité intérieure libère l''harmonie universelle quand on s''y abandonne avec foi. La foi révèle les profondeurs de l''être au-delà de toute souffrance. La conscience libère les résistances de l''ego dans la douceur du présent.\n\nLa prière appelle vers l''espace du cœur et ouvre la porte du pardon. La douceur de Dieu touche en profondeur notre monde intérieur avec une infinie tendresse.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0081',
  '2026-04-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0081' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0081' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [082] seed-test-0082
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''âme traverse l''appel de la conscience et ouvre la porte du pardon. La conscience libère l''harmonie universelle et ouvre la porte du pardon. La vérité intérieure habite les zones d''ombre en nous et invite à la gratitude.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0082',
  '2026-03-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0082' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0082' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [083] seed-test-0083
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière embrasse les profondeurs de l''être si l''on accepte de lâcher-prise. La grâce transforme l''appel de la conscience en chaque instant de la vie.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0083',
  '2026-03-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0083' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0083' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [084] seed-test-0084
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce rayonne vers l''espace du cœur et invite à la gratitude. Le souffle de Dieu nourrit le chemin vers la lumière là où le mental s''efface. L''esprit accompagne l''harmonie universelle et révèle la beauté de l''existence. La paix intérieure habite les zones d''ombre en nous et révèle la beauté de l''existence.\n\nLe chemin intérieur traverse la profondeur du souffle avec une infinie tendresse. La sagesse guérit l''harmonie universelle dans la douceur du présent. La prière révèle les résistances de l''ego quand on s''y abandonne avec foi. La miséricorde rayonne vers l''espace du cœur et ouvre la porte du pardon.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0084',
  '2026-06-10'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0084' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0084' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;

-- [085] seed-test-0085
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience embrasse les profondeurs de l''être là où le mental s''efface. Le regard de Dieu révèle notre dimension invisible et invite à la gratitude. La prière accompagne l''espace du cœur avec une infinie tendresse.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0085',
  '2026-06-06'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0085' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0085' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [086] seed-test-0086
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine guérit la relation à la Source là où le mental s''efface. La conscience accompagne les résistances de l''ego et invite à la gratitude.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0086',
  '2026-06-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0086' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0086' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [087] seed-test-0087
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu traverse les liens qui nous unissent là où le mental s''efface. La sagesse libère le chemin vers la lumière et invite à la gratitude.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0087',
  '2026-04-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0087' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0087' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [088] seed-test-0088
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse embrasse la relation à la Source au-delà de toute souffrance.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0088',
  '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0088' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0088' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [089] seed-test-0089
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le cœur embrasse le chemin vers la lumière là où le mental s''efface. La conscience guérit notre monde intérieur avec une infinie tendresse. La foi rayonne vers le silence sacré quand on s''y abandonne avec foi.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0089',
  '2026-06-21'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0089' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0089' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [090] seed-test-0090
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour apaise la relation à la Source quand on s''y abandonne avec foi.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0090',
  '2026-04-01'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0090' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0090' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [091] seed-test-0091
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde élève les résistances de l''ego et ouvre la porte du pardon. La prière rayonne vers les liens qui nous unissent et révèle la beauté de l''existence. La douceur de Dieu révèle l''appel de la conscience dans la douceur du présent.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0091',
  '2026-01-05'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0091' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0091' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [092] seed-test-0092
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde ouvre l''appel de la conscience quand on s''y abandonne avec foi. L''esprit appelle vers la profondeur du souffle et invite à la gratitude.\n\nLa douceur de Dieu élève notre dimension invisible quand on s''y abandonne avec foi. Le cœur habite la profondeur du souffle en chaque instant de la vie.\n\nLa douceur de Dieu rayonne vers le silence sacré et ouvre la porte du pardon. La sagesse purifie la vérité de notre nature avec une infinie tendresse. La sagesse élève la vérité de notre nature si l''on accepte de lâcher-prise.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0092',
  '2026-01-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0092' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0092' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [093] seed-test-0093
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure transforme le silence sacré et invite à la gratitude. La prière transforme la vérité de notre nature au-delà de toute souffrance. La sagesse purifie l''appel de la conscience au-delà de toute souffrance.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0093',
  '2026-06-01'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0093' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0093' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [094] seed-test-0094
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour accompagne notre dimension invisible et révèle la beauté de l''existence. La prière transforme les zones d''ombre en nous et révèle la beauté de l''existence. L''esprit invite à découvrir la vibration de l''amour en chaque instant de la vie.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0094',
  '2026-02-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0094' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0094' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [095] seed-test-0095
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde apaise l''espace du cœur en chaque instant de la vie. Chaque être apaise notre dimension invisible et révèle la beauté de l''existence. L''amour élève le chemin vers la lumière et invite à la gratitude. La foi accompagne le silence sacré au-delà de toute souffrance.\n\nL''amour ouvre le silence sacré là où le mental s''efface. La vérité intérieure habite la relation à la Source quand on s''y abandonne avec foi. Le chemin intérieur appelle vers la vibration de l''amour et révèle la beauté de l''existence.\n\nLe chemin intérieur illumine le chemin vers la lumière dans la douceur du présent. La douceur de Dieu embrasse la relation à la Source en chaque instant de la vie. La vérité intérieure traverse les profondeurs de l''être et invite à la gratitude.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0095',
  '2026-05-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0095' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0095' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [096] seed-test-0096
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine nourrit l''harmonie universelle là où le mental s''efface. La paix intérieure traverse les profondeurs de l''être dans la douceur du présent. La lumière touche en profondeur la relation à la Source là où le mental s''efface.\n\nLa foi guérit les liens qui nous unissent avec une infinie tendresse. Chaque être touche en profondeur notre dimension invisible au-delà de toute souffrance. Le regard de Dieu apaise les zones d''ombre en nous et ouvre la porte du pardon. La paix intérieure traverse l''appel de la conscience là où le mental s''efface.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0096',
  '2026-02-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0096' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0096' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [097] seed-test-0097
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière élève l''harmonie universelle là où le mental s''efface. Le chemin intérieur appelle vers la vibration de l''amour quand on s''y abandonne avec foi.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0097',
  '2026-02-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0097' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0097' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [098] seed-test-0098
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu touche en profondeur la vibration de l''amour au-delà de toute souffrance. La foi invite à découvrir le silence sacré et invite à la gratitude. La conscience habite la vérité de notre nature et ouvre la porte du pardon. L''esprit rayonne vers l''appel de la conscience et invite à la gratitude.\n\nLe chemin intérieur nourrit la vérité de notre nature au-delà de toute souffrance. La vérité intérieure libère l''harmonie universelle et invite à la gratitude. La vérité intérieure invite à découvrir les zones d''ombre en nous avec une infinie tendresse. Le regard de Dieu accompagne les zones d''ombre en nous en chaque instant de la vie.\n\nLa vérité intérieure apaise la relation à la Source et invite à la gratitude. Chaque être habite les liens qui nous unissent quand on s''y abandonne avec foi.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0098',
  '2026-02-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0098' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0098' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [099] seed-test-0099
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde habite la vérité de notre nature et révèle la beauté de l''existence. La douceur de Dieu accompagne l''espace du cœur quand on s''y abandonne avec foi.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0099',
  '2026-03-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0099' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0099' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;

-- [100] seed-test-0100
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour nourrit notre monde intérieur si l''on accepte de lâcher-prise.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0100',
  '2026-03-23'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0100' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0100' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

COMMIT;
