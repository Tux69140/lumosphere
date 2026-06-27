-- ┌──────────────────────────────────────────────────────────────────────────┐
-- │ GÉNÉRÉ par db/seeds/generate_citations.py (SEED=42, N=200)              │
-- │ NE PAS MODIFIER — régénérer :                                           │
-- │   python3 db/seeds/generate_citations.py --n <N>                        │
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
SELECT 'La sagesse transforme le chemin vers la lumière dans la douceur du présent. La sagesse transforme les profondeurs de l''être là où le mental s''efface. La présence divine nourrit les zones d''ombre en nous et révèle la beauté de l''existence.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0001',
  '2026-04-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0001' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0001' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [002] seed-test-0002
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde transforme le silence sacré là où le mental s''efface. La vérité intérieure touche en profondeur les zones d''ombre en nous dans la douceur du présent.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0002',
  '2026-03-12'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0002' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0002' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;

-- [003] seed-test-0003
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le silence traverse l''appel de la conscience avec une infinie tendresse. L''esprit élève la profondeur du souffle en chaque instant de la vie.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0003',
  '2026-02-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0003' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0003' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

-- [004] seed-test-0004
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour nourrit les zones d''ombre en nous et ouvre la porte du pardon. La paix intérieure transforme le silence sacré et révèle la beauté de l''existence. L''amour purifie le silence sacré et révèle la beauté de l''existence. La conscience rayonne vers le silence sacré en chaque instant de la vie.\n\nL''âme purifie les liens qui nous unissent là où le mental s''efface. La sagesse guérit l''appel de la conscience si l''on accepte de lâcher-prise.\n\nLa douceur de Dieu accompagne la vérité de notre nature avec une infinie tendresse. Le souffle de Dieu illumine le chemin vers la lumière si l''on accepte de lâcher-prise. Le cœur nourrit les profondeurs de l''être et ouvre la porte du pardon.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0004',
  '2026-03-24'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0004' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0004' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [005] seed-test-0005
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure purifie notre dimension invisible et invite à la gratitude. L''esprit illumine notre monde intérieur avec une infinie tendresse. La grâce traverse les liens qui nous unissent et ouvre la porte du pardon.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0005',
  '2026-05-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0005' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0005' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [006] seed-test-0006
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu accompagne l''harmonie universelle si l''on accepte de lâcher-prise. La miséricorde élève la relation à la Source dans la douceur du présent. La paix intérieure ouvre les résistances de l''ego au-delà de toute souffrance.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0006',
  '2026-05-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0006' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0006' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [007] seed-test-0007
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure habite la vibration de l''amour et révèle la beauté de l''existence. Chaque être purifie notre monde intérieur et révèle la beauté de l''existence. Le cœur guérit notre dimension invisible avec une infinie tendresse.\n\nLe regard de Dieu habite le chemin vers la lumière en chaque instant de la vie. La foi libère l''appel de la conscience en chaque instant de la vie. La présence divine illumine les profondeurs de l''être en chaque instant de la vie. Le chemin intérieur guérit la vibration de l''amour dans la douceur du présent.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0007',
  '2026-02-23'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0007' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0007' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [008] seed-test-0008
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''âme apaise l''appel de la conscience dans la douceur du présent. L''amour ouvre l''appel de la conscience avec une infinie tendresse.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0008',
  '2026-05-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0008' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0008' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [009] seed-test-0009
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu touche en profondeur les résistances de l''ego là où le mental s''efface. Chaque être appelle vers les liens qui nous unissent avec une infinie tendresse. Chaque être ouvre l''harmonie universelle et révèle la beauté de l''existence.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0009',
  '2026-02-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0009' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0009' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [010] seed-test-0010
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être guérit l''harmonie universelle si l''on accepte de lâcher-prise. L''amour nourrit l''espace du cœur là où le mental s''efface. La miséricorde guérit les zones d''ombre en nous quand on s''y abandonne avec foi.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0010',
  '2026-06-05'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0010' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0010' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [011] seed-test-0011
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde embrasse les liens qui nous unissent et invite à la gratitude. La grâce révèle les liens qui nous unissent au-delà de toute souffrance. L''âme accompagne la vibration de l''amour et invite à la gratitude.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0011',
  '2026-04-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0011' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0011' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [012] seed-test-0012
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour nourrit les liens qui nous unissent et révèle la beauté de l''existence. L''âme accompagne l''espace du cœur dans la douceur du présent. Le cœur embrasse la profondeur du souffle quand on s''y abandonne avec foi.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0012',
  '2026-01-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0012' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0012' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [013] seed-test-0013
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine embrasse les zones d''ombre en nous et invite à la gratitude.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0013',
  '2026-03-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0013' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0013' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [014] seed-test-0014
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit nourrit le silence sacré et ouvre la porte du pardon. Le chemin intérieur illumine l''harmonie universelle avec une infinie tendresse. La lumière traverse la relation à la Source et ouvre la porte du pardon.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0014',
  '2026-01-25'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0014' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0014' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;

-- [015] seed-test-0015
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''âme élève la relation à la Source quand on s''y abandonne avec foi.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0015',
  '2026-01-19'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0015' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0015' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [016] seed-test-0016
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience ouvre les résistances de l''ego au-delà de toute souffrance.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0016',
  '2026-01-25'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0016' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0016' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [017] seed-test-0017
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure illumine la profondeur du souffle si l''on accepte de lâcher-prise.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0017',
  '2026-04-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0017' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0017' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [018] seed-test-0018
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu apaise l''appel de la conscience au-delà de toute souffrance. La lumière traverse notre monde intérieur dans la douceur du présent. La conscience guérit notre monde intérieur là où le mental s''efface. L''âme révèle le silence sacré et révèle la beauté de l''existence.\n\nL''esprit traverse la vérité de notre nature et révèle la beauté de l''existence. La présence divine révèle les zones d''ombre en nous avec une infinie tendresse.\n\nLa sagesse touche en profondeur l''appel de la conscience et révèle la beauté de l''existence. Chaque être révèle le silence sacré au-delà de toute souffrance. La sagesse habite le silence sacré en chaque instant de la vie. La prière nourrit la profondeur du souffle et révèle la beauté de l''existence.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0018',
  '2026-04-19'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0018' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0018' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [019] seed-test-0019
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le cœur invite à découvrir la relation à la Source là où le mental s''efface. La sagesse habite notre dimension invisible au-delà de toute souffrance. La sagesse touche en profondeur les profondeurs de l''être avec une infinie tendresse.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0019',
  '2026-02-24'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0019' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0019' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [020] seed-test-0020
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur invite à découvrir la vibration de l''amour et invite à la gratitude.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0020',
  '2026-02-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0020' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0020' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [021] seed-test-0021
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit touche en profondeur l''espace du cœur là où le mental s''efface. Chaque être nourrit notre dimension invisible si l''on accepte de lâcher-prise. L''amour apaise l''harmonie universelle en chaque instant de la vie.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0021',
  '2026-06-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0021' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0021' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [022] seed-test-0022
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure appelle vers les résistances de l''ego si l''on accepte de lâcher-prise. Le silence purifie notre dimension invisible en chaque instant de la vie. La conscience ouvre notre dimension invisible et invite à la gratitude. La miséricorde élève notre dimension invisible et invite à la gratitude.\n\nLa miséricorde rayonne vers l''harmonie universelle quand on s''y abandonne avec foi. Le chemin intérieur apaise le silence sacré et invite à la gratitude.\n\nLa foi invite à découvrir la vibration de l''amour et révèle la beauté de l''existence. Le souffle de Dieu ouvre les profondeurs de l''être si l''on accepte de lâcher-prise. Le chemin intérieur apaise le silence sacré et ouvre la porte du pardon. La paix intérieure invite à découvrir le chemin vers la lumière au-delà de toute souffrance.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0022',
  '2026-01-05'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0022' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0022' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [023] seed-test-0023
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière libère le chemin vers la lumière avec une infinie tendresse.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0023',
  '2026-05-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0023' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0023' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [024] seed-test-0024
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi révèle notre dimension invisible au-delà de toute souffrance. Le regard de Dieu transforme les résistances de l''ego et ouvre la porte du pardon. La grâce purifie notre dimension invisible et ouvre la porte du pardon.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Lois universelles et plans de conscience'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0024',
  '2026-02-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0024' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0024' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [025] seed-test-0025
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit embrasse l''harmonie universelle au-delà de toute souffrance.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0025',
  '2026-01-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0025' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0025' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [026] seed-test-0026
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse purifie les liens qui nous unissent et ouvre la porte du pardon. La miséricorde libère la vérité de notre nature quand on s''y abandonne avec foi.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0026',
  '2026-02-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0026' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0026' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [027] seed-test-0027
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le silence embrasse l''harmonie universelle si l''on accepte de lâcher-prise. La paix intérieure nourrit notre monde intérieur avec une infinie tendresse. Le chemin intérieur embrasse le chemin vers la lumière au-delà de toute souffrance.\n\nL''esprit habite les résistances de l''ego si l''on accepte de lâcher-prise. L''âme guérit la relation à la Source au-delà de toute souffrance.\n\nL''âme nourrit les résistances de l''ego et invite à la gratitude. Le cœur invite à découvrir notre monde intérieur et révèle la beauté de l''existence. La sagesse ouvre les résistances de l''ego dans la douceur du présent. Le chemin intérieur guérit la vibration de l''amour là où le mental s''efface.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0027',
  '2026-03-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0027' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0027' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

-- [028] seed-test-0028
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit invite à découvrir notre dimension invisible dans la douceur du présent.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0028',
  '2026-05-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0028' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0028' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [029] seed-test-0029
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu apaise l''appel de la conscience dans la douceur du présent.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0029',
  '2026-01-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0029' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0029' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;

-- [030] seed-test-0030
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur embrasse l''appel de la conscience et invite à la gratitude. La grâce nourrit notre monde intérieur quand on s''y abandonne avec foi. La foi embrasse la profondeur du souffle et révèle la beauté de l''existence. Le silence illumine la vérité de notre nature au-delà de toute souffrance.\n\nLe cœur rayonne vers notre monde intérieur et invite à la gratitude. La miséricorde révèle le chemin vers la lumière en chaque instant de la vie.\n\nChaque être apaise la vérité de notre nature quand on s''y abandonne avec foi. Le chemin intérieur rayonne vers notre monde intérieur si l''on accepte de lâcher-prise.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0030',
  '2026-04-16'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0030' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0030' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [031] seed-test-0031
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La paix intérieure purifie la profondeur du souffle au-delà de toute souffrance. La douceur de Dieu élève le silence sacré et ouvre la porte du pardon.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0031',
  '2026-04-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0031' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0031' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [032] seed-test-0032
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine embrasse notre monde intérieur et révèle la beauté de l''existence. La conscience habite notre monde intérieur avec une infinie tendresse. La paix intérieure embrasse la profondeur du souffle là où le mental s''efface.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Lois universelles et plans de conscience'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0032',
  '2026-06-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0032' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0032' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [033] seed-test-0033
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu invite à découvrir l''harmonie universelle dans la douceur du présent.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0033',
  '2026-06-05'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0033' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0033' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [034] seed-test-0034
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure habite le silence sacré et ouvre la porte du pardon.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0034',
  '2026-04-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0034' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0034' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [035] seed-test-0035
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine guérit la vibration de l''amour si l''on accepte de lâcher-prise.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0035',
  '2026-06-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0035' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0035' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [036] seed-test-0036
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu invite à découvrir le silence sacré avec une infinie tendresse.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0036',
  '2026-01-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0036' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0036' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [037] seed-test-0037
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le silence apaise la vibration de l''amour quand on s''y abandonne avec foi.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0037',
  '2026-01-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0037' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0037' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [038] seed-test-0038
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit élève la relation à la Source avec une infinie tendresse. L''esprit ouvre les zones d''ombre en nous quand on s''y abandonne avec foi. La prière accompagne les résistances de l''ego en chaque instant de la vie.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0038',
  '2026-02-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0038' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0038' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [039] seed-test-0039
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''âme embrasse la profondeur du souffle si l''on accepte de lâcher-prise.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0039',
  '2026-02-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0039' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0039' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [040] seed-test-0040
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit nourrit la vibration de l''amour si l''on accepte de lâcher-prise.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0040',
  '2026-04-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0040' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0040' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [041] seed-test-0041
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience rayonne vers l''harmonie universelle si l''on accepte de lâcher-prise.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0041',
  '2026-06-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0041' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0041' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [042] seed-test-0042
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour traverse la relation à la Source en chaque instant de la vie. Le regard de Dieu nourrit la vérité de notre nature quand on s''y abandonne avec foi. Le silence transforme notre dimension invisible et révèle la beauté de l''existence.\n\nLa vérité intérieure traverse l''harmonie universelle quand on s''y abandonne avec foi. La prière rayonne vers l''espace du cœur dans la douceur du présent.\n\nLa grâce élève l''appel de la conscience avec une infinie tendresse. La conscience appelle vers notre monde intérieur si l''on accepte de lâcher-prise.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0042',
  '2026-03-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0042' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0042' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [043] seed-test-0043
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être guérit les zones d''ombre en nous en chaque instant de la vie.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0043',
  '2026-06-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0043' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0043' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [044] seed-test-0044
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse touche en profondeur le chemin vers la lumière et révèle la beauté de l''existence. La conscience nourrit les résistances de l''ego dans la douceur du présent.\n\nLa conscience apaise la vérité de notre nature en chaque instant de la vie. Le chemin intérieur illumine les résistances de l''ego avec une infinie tendresse. Le souffle de Dieu libère la vérité de notre nature et ouvre la porte du pardon. Chaque être rayonne vers la vérité de notre nature dans la douceur du présent.\n\nLa présence divine transforme les profondeurs de l''être si l''on accepte de lâcher-prise. Le chemin intérieur apaise le chemin vers la lumière en chaque instant de la vie.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0044',
  '2026-04-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0044' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0044' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [045] seed-test-0045
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit apaise le silence sacré et révèle la beauté de l''existence.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0045',
  '2026-03-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0045' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0045' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [046] seed-test-0046
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience apaise la vérité de notre nature là où le mental s''efface. La miséricorde traverse les profondeurs de l''être dans la douceur du présent.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Lois universelles et plans de conscience'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0046',
  '2026-01-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0046' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0046' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [047] seed-test-0047
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière habite la relation à la Source quand on s''y abandonne avec foi.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0047',
  '2026-02-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0047' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0047' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [048] seed-test-0048
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine illumine notre dimension invisible quand on s''y abandonne avec foi. La présence divine touche en profondeur notre dimension invisible quand on s''y abandonne avec foi. Le silence illumine les zones d''ombre en nous et invite à la gratitude.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0048',
  '2026-02-19'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0048' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0048' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [049] seed-test-0049
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit appelle vers le chemin vers la lumière et ouvre la porte du pardon. Le chemin intérieur embrasse l''appel de la conscience là où le mental s''efface.\n\nLa vérité intérieure apaise la vibration de l''amour avec une infinie tendresse. L''amour transforme l''harmonie universelle avec une infinie tendresse. La foi embrasse la vérité de notre nature et invite à la gratitude. La lumière invite à découvrir le silence sacré dans la douceur du présent.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0049',
  '2026-01-16'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0049' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0049' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

-- [050] seed-test-0050
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière élève notre dimension invisible au-delà de toute souffrance. La vérité intérieure touche en profondeur l''harmonie universelle là où le mental s''efface.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0050',
  '2026-05-10'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0050' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0050' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [051] seed-test-0051
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde purifie les liens qui nous unissent et révèle la beauté de l''existence. L''amour révèle l''espace du cœur et révèle la beauté de l''existence.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0051',
  '2026-06-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0051' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0051' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [052] seed-test-0052
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine invite à découvrir le chemin vers la lumière et ouvre la porte du pardon. La prière guérit les liens qui nous unissent et ouvre la porte du pardon. La conscience élève notre monde intérieur et invite à la gratitude.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0052',
  '2026-05-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0052' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0052' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [053] seed-test-0053
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu rayonne vers l''espace du cœur et ouvre la porte du pardon. La vérité intérieure appelle vers la relation à la Source quand on s''y abandonne avec foi. Le chemin intérieur libère le silence sacré et ouvre la porte du pardon.\n\nLa miséricorde traverse le chemin vers la lumière si l''on accepte de lâcher-prise. La vérité intérieure libère l''appel de la conscience dans la douceur du présent. La miséricorde touche en profondeur les profondeurs de l''être au-delà de toute souffrance.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0053',
  '2026-06-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0053' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0053' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [054] seed-test-0054
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi habite l''espace du cœur et invite à la gratitude.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0054',
  '2026-02-19'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0054' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0054' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [055] seed-test-0055
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu purifie les liens qui nous unissent dans la douceur du présent. Chaque être habite les zones d''ombre en nous là où le mental s''efface.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0055',
  '2026-03-25'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0055' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0055' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [056] seed-test-0056
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu transforme la vérité de notre nature et ouvre la porte du pardon. La sagesse embrasse la vérité de notre nature dans la douceur du présent.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0056',
  '2026-04-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0056' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0056' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [057] seed-test-0057
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le silence rayonne vers la vérité de notre nature au-delà de toute souffrance. Le chemin intérieur appelle vers la vérité de notre nature si l''on accepte de lâcher-prise. La lumière libère les liens qui nous unissent au-delà de toute souffrance.\n\nL''âme purifie notre dimension invisible en chaque instant de la vie. La présence divine nourrit notre dimension invisible là où le mental s''efface.\n\nL''âme invite à découvrir l''harmonie universelle dans la douceur du présent. Le cœur élève les liens qui nous unissent avec une infinie tendresse.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Lois universelles et plans de conscience'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0057',
  '2026-05-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0057' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0057' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [058] seed-test-0058
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''âme embrasse la profondeur du souffle et ouvre la porte du pardon. Le souffle de Dieu révèle les résistances de l''ego dans la douceur du présent. L''esprit rayonne vers le chemin vers la lumière dans la douceur du présent.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0058',
  '2026-02-26'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0058' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0058' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [059] seed-test-0059
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour révèle les résistances de l''ego dans la douceur du présent. La douceur de Dieu guérit les liens qui nous unissent si l''on accepte de lâcher-prise.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0059',
  '2026-02-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0059' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0059' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [060] seed-test-0060
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu appelle vers la relation à la Source là où le mental s''efface. La conscience élève la relation à la Source et ouvre la porte du pardon.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0060',
  '2026-02-06'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0060' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0060' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [061] seed-test-0061
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure embrasse la vérité de notre nature au-delà de toute souffrance. Le regard de Dieu habite le silence sacré là où le mental s''efface. La présence divine embrasse le chemin vers la lumière et révèle la beauté de l''existence.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0061',
  '2026-03-26'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0061' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0061' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [062] seed-test-0062
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu guérit notre dimension invisible et révèle la beauté de l''existence.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0062',
  '2026-01-12'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0062' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0062' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [063] seed-test-0063
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La paix intérieure embrasse les résistances de l''ego avec une infinie tendresse.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0063',
  '2026-01-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0063' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0063' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [064] seed-test-0064
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière embrasse le chemin vers la lumière là où le mental s''efface. La prière appelle vers la vérité de notre nature quand on s''y abandonne avec foi.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Lois universelles et plans de conscience'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0064',
  '2026-06-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0064' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0064' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;

-- [065] seed-test-0065
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi accompagne les liens qui nous unissent là où le mental s''efface. Le regard de Dieu transforme l''appel de la conscience là où le mental s''efface. La prière habite le chemin vers la lumière avec une infinie tendresse.\n\nLa paix intérieure rayonne vers notre dimension invisible au-delà de toute souffrance. La présence divine habite le chemin vers la lumière au-delà de toute souffrance. La présence divine traverse notre dimension invisible dans la douceur du présent. La présence divine guérit notre dimension invisible avec une infinie tendresse.\n\nLe souffle de Dieu élève la vérité de notre nature avec une infinie tendresse. La prière révèle notre monde intérieur là où le mental s''efface. L''âme traverse notre dimension invisible quand on s''y abandonne avec foi.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0065',
  '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0065' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0065' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [066] seed-test-0066
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière rayonne vers le silence sacré et ouvre la porte du pardon.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0066',
  '2026-05-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0066' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0066' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [067] seed-test-0067
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le cœur ouvre le silence sacré au-delà de toute souffrance. Le cœur embrasse les profondeurs de l''être dans la douceur du présent.\n\nL''amour embrasse les résistances de l''ego si l''on accepte de lâcher-prise. Chaque être libère notre monde intérieur en chaque instant de la vie. La foi invite à découvrir la profondeur du souffle en chaque instant de la vie.\n\nLa vérité intérieure embrasse la vibration de l''amour si l''on accepte de lâcher-prise. La paix intérieure appelle vers notre monde intérieur dans la douceur du présent. Le cœur purifie l''appel de la conscience au-delà de toute souffrance.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0067',
  '2026-03-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0067' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0067' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [068] seed-test-0068
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi guérit l''appel de la conscience quand on s''y abandonne avec foi. La sagesse embrasse la profondeur du souffle avec une infinie tendresse.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0068',
  '2026-04-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0068' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0068' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [069] seed-test-0069
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière accompagne notre monde intérieur là où le mental s''efface. L''amour accompagne le chemin vers la lumière là où le mental s''efface. L''amour illumine l''espace du cœur et ouvre la porte du pardon.\n\nLe souffle de Dieu élève les zones d''ombre en nous et invite à la gratitude. La foi invite à découvrir l''harmonie universelle quand on s''y abandonne avec foi. Le chemin intérieur embrasse les résistances de l''ego et invite à la gratitude. La prière illumine notre dimension invisible en chaque instant de la vie.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0069',
  '2026-05-24'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0069' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0069' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [070] seed-test-0070
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi apaise les profondeurs de l''être en chaque instant de la vie. L''esprit embrasse le chemin vers la lumière et ouvre la porte du pardon.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0070',
  '2026-05-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0070' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0070' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [071] seed-test-0071
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine rayonne vers les liens qui nous unissent et invite à la gratitude. Le regard de Dieu traverse la relation à la Source au-delà de toute souffrance. L''esprit ouvre la vérité de notre nature et ouvre la porte du pardon. La douceur de Dieu traverse le chemin vers la lumière avec une infinie tendresse.\n\nLa douceur de Dieu appelle vers notre monde intérieur et invite à la gratitude. La paix intérieure invite à découvrir les profondeurs de l''être dans la douceur du présent. La conscience nourrit l''harmonie universelle et invite à la gratitude. La conscience guérit l''espace du cœur en chaque instant de la vie.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0071',
  '2026-06-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0071' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0071' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [072] seed-test-0072
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde habite le silence sacré quand on s''y abandonne avec foi.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0072',
  '2026-06-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0072' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0072' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [073] seed-test-0073
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être transforme notre dimension invisible en chaque instant de la vie.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0073',
  '2026-02-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0073' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0073' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [074] seed-test-0074
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse transforme l''appel de la conscience en chaque instant de la vie. La foi traverse le silence sacré et invite à la gratitude. Le souffle de Dieu nourrit le chemin vers la lumière là où le mental s''efface.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0074',
  '2026-06-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0074' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0074' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [075] seed-test-0075
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience appelle vers notre dimension invisible et ouvre la porte du pardon. L''esprit guérit les liens qui nous unissent au-delà de toute souffrance. Le cœur touche en profondeur notre dimension invisible là où le mental s''efface.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0075',
  '2026-03-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0075' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0075' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [076] seed-test-0076
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le cœur embrasse l''espace du cœur et révèle la beauté de l''existence.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0076',
  '2026-03-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0076' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0076' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [077] seed-test-0077
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience appelle vers l''appel de la conscience quand on s''y abandonne avec foi. L''âme élève le silence sacré au-delà de toute souffrance. Chaque être transforme les zones d''ombre en nous et ouvre la porte du pardon.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0077',
  '2026-06-12'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0077' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0077' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [078] seed-test-0078
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être traverse l''espace du cœur et révèle la beauté de l''existence. La prière élève notre monde intérieur là où le mental s''efface.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0078',
  '2026-06-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0078' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0078' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [079] seed-test-0079
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur appelle vers les liens qui nous unissent avec une infinie tendresse. Le silence nourrit l''appel de la conscience si l''on accepte de lâcher-prise.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0079',
  '2026-02-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0079' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0079' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [080] seed-test-0080
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière embrasse les zones d''ombre en nous et révèle la beauté de l''existence. La prière habite la vérité de notre nature là où le mental s''efface.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0080',
  '2026-05-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0080' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0080' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [081] seed-test-0081
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu libère le chemin vers la lumière en chaque instant de la vie. La présence divine libère l''appel de la conscience et révèle la beauté de l''existence. L''âme traverse notre monde intérieur au-delà de toute souffrance.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0081',
  '2026-05-05'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0081' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0081' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [082] seed-test-0082
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu révèle l''appel de la conscience dans la douceur du présent. La vérité intérieure guérit les zones d''ombre en nous là où le mental s''efface. La prière embrasse la vibration de l''amour avec une infinie tendresse.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0082',
  '2026-05-21'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0082' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0082' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [083] seed-test-0083
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière apaise notre monde intérieur quand on s''y abandonne avec foi.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0083',
  '2026-02-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0083' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0083' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [084] seed-test-0084
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse purifie la vérité de notre nature avec une infinie tendresse. La sagesse élève la vérité de notre nature si l''on accepte de lâcher-prise.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0084',
  '2026-01-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0084' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0084' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [085] seed-test-0085
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure transforme le silence sacré et invite à la gratitude. La prière transforme la vérité de notre nature au-delà de toute souffrance. La sagesse purifie l''appel de la conscience au-delà de toute souffrance.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0085',
  '2026-06-01'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0085' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0085' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [086] seed-test-0086
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour accompagne notre dimension invisible et révèle la beauté de l''existence. La prière transforme les zones d''ombre en nous et révèle la beauté de l''existence. L''esprit invite à découvrir la vibration de l''amour en chaque instant de la vie.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0086',
  '2026-02-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0086' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0086' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [087] seed-test-0087
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu touche en profondeur le chemin vers la lumière là où le mental s''efface. L''amour embrasse le chemin vers la lumière si l''on accepte de lâcher-prise. Chaque être libère les zones d''ombre en nous et ouvre la porte du pardon.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0087',
  '2026-04-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0087' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0087' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

-- [088] seed-test-0088
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce ouvre la vibration de l''amour avec une infinie tendresse. Chaque être invite à découvrir la profondeur du souffle si l''on accepte de lâcher-prise. Le chemin intérieur illumine le chemin vers la lumière dans la douceur du présent.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0088',
  '2026-02-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0088' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0088' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [089] seed-test-0089
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur invite à découvrir notre dimension invisible avec une infinie tendresse.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0089',
  '2026-01-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0089' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0089' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [090] seed-test-0090
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience transforme les liens qui nous unissent et invite à la gratitude. La vérité intérieure touche en profondeur la relation à la Source là où le mental s''efface. La miséricorde rayonne vers le chemin vers la lumière dans la douceur du présent.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0090',
  '2026-05-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0090' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0090' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [091] seed-test-0091
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience habite notre monde intérieur là où le mental s''efface. La présence divine purifie les résistances de l''ego avec une infinie tendresse. La paix intérieure appelle vers les profondeurs de l''être et invite à la gratitude.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0091',
  '2026-06-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0091' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0091' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [092] seed-test-0092
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu habite les zones d''ombre en nous dans la douceur du présent. Le regard de Dieu rayonne vers les résistances de l''ego là où le mental s''efface.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0092',
  '2026-05-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0092' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0092' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [093] seed-test-0093
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience habite la vérité de notre nature et ouvre la porte du pardon. L''esprit rayonne vers l''appel de la conscience et invite à la gratitude.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0093',
  '2026-03-21'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0093' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0093' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [094] seed-test-0094
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu accompagne les zones d''ombre en nous en chaque instant de la vie. La lumière apaise la relation à la Source et invite à la gratitude. Chaque être habite les liens qui nous unissent quand on s''y abandonne avec foi. L''esprit purifie les liens qui nous unissent avec une infinie tendresse.\n\nLe chemin intérieur transforme l''harmonie universelle quand on s''y abandonne avec foi. La douceur de Dieu purifie notre monde intérieur là où le mental s''efface. Le chemin intérieur appelle vers les liens qui nous unissent là où le mental s''efface. Le cœur embrasse la profondeur du souffle avec une infinie tendresse.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0094',
  '2026-03-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0094' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0094' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [095] seed-test-0095
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde rayonne vers la relation à la Source si l''on accepte de lâcher-prise. La foi purifie l''harmonie universelle et révèle la beauté de l''existence. Le souffle de Dieu invite à découvrir l''espace du cœur avec une infinie tendresse.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0095',
  '2026-03-10'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0095' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0095' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [096] seed-test-0096
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La paix intérieure traverse l''appel de la conscience quand on s''y abandonne avec foi. La foi transforme notre dimension invisible et ouvre la porte du pardon. La conscience embrasse la vérité de notre nature si l''on accepte de lâcher-prise.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0096',
  '2026-02-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0096' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0096' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [097] seed-test-0097
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu libère la relation à la Source et invite à la gratitude. La douceur de Dieu libère la vérité de notre nature en chaque instant de la vie.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0097',
  '2026-04-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0097' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0097' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [098] seed-test-0098
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur invite à découvrir la vérité de notre nature en chaque instant de la vie. La foi habite notre dimension invisible et invite à la gratitude. La prière libère notre monde intérieur et invite à la gratitude.\n\nL''esprit ouvre la profondeur du souffle et invite à la gratitude. La paix intérieure invite à découvrir les zones d''ombre en nous si l''on accepte de lâcher-prise.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0098',
  '2026-03-19'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0098' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0098' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [099] seed-test-0099
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde appelle vers la vibration de l''amour quand on s''y abandonne avec foi.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0099',
  '2026-04-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0099' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0099' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

-- [100] seed-test-0100
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être nourrit l''harmonie universelle quand on s''y abandonne avec foi. L''âme habite l''appel de la conscience si l''on accepte de lâcher-prise. La vérité intérieure purifie les zones d''ombre en nous au-delà de toute souffrance. La paix intérieure révèle notre monde intérieur là où le mental s''efface.\n\nLa paix intérieure apaise les zones d''ombre en nous quand on s''y abandonne avec foi. Le chemin intérieur habite la profondeur du souffle en chaque instant de la vie.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0100',
  '2026-04-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0100' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0100' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [101] seed-test-0101
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse traverse l''harmonie universelle en chaque instant de la vie. La lumière apaise la vibration de l''amour si l''on accepte de lâcher-prise.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0101',
  '2026-06-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0101' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0101' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [102] seed-test-0102
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour élève la vibration de l''amour quand on s''y abandonne avec foi. Chaque être traverse les liens qui nous unissent avec une infinie tendresse.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0102',
  '2026-05-26'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0102' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0102' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [103] seed-test-0103
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être appelle vers l''harmonie universelle là où le mental s''efface.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0103',
  '2026-01-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0103' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0103' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [104] seed-test-0104
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu appelle vers la vibration de l''amour et ouvre la porte du pardon. La grâce invite à découvrir le chemin vers la lumière avec une infinie tendresse.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0104',
  '2026-01-15'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0104' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0104' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [105] seed-test-0105
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure transforme notre monde intérieur et révèle la beauté de l''existence. La foi illumine les liens qui nous unissent si l''on accepte de lâcher-prise. L''âme purifie les résistances de l''ego et ouvre la porte du pardon.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0105',
  '2026-03-23'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0105' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0105' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [106] seed-test-0106
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière invite à découvrir les profondeurs de l''être si l''on accepte de lâcher-prise.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0106',
  '2026-02-25'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0106' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0106' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [107] seed-test-0107
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière touche en profondeur les zones d''ombre en nous là où le mental s''efface. Le silence ouvre notre monde intérieur dans la douceur du présent. La douceur de Dieu élève l''harmonie universelle en chaque instant de la vie.\n\nL''âme rayonne vers la vibration de l''amour avec une infinie tendresse. L''esprit touche en profondeur les liens qui nous unissent en chaque instant de la vie.\n\nChaque être traverse les zones d''ombre en nous si l''on accepte de lâcher-prise. La grâce apaise les profondeurs de l''être dans la douceur du présent.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0107',
  '2026-01-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0107' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0107' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [108] seed-test-0108
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être transforme la relation à la Source et invite à la gratitude. La paix intérieure embrasse la relation à la Source avec une infinie tendresse.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0108',
  '2026-01-05'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0108' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0108' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [109] seed-test-0109
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi élève la vérité de notre nature avec une infinie tendresse. L''amour révèle notre dimension invisible si l''on accepte de lâcher-prise.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0109',
  '2026-05-24'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0109' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0109' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [110] seed-test-0110
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière traverse la vérité de notre nature dans la douceur du présent. La douceur de Dieu habite l''harmonie universelle dans la douceur du présent. L''esprit élève notre dimension invisible dans la douceur du présent.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0110',
  '2026-05-16'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0110' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0110' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [111] seed-test-0111
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine embrasse la profondeur du souffle et invite à la gratitude.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0111',
  '2026-04-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0111' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0111' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [112] seed-test-0112
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce habite la vérité de notre nature et ouvre la porte du pardon.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0112',
  '2026-03-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0112' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0112' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [113] seed-test-0113
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce touche en profondeur la relation à la Source et révèle la beauté de l''existence. La grâce habite notre dimension invisible et invite à la gratitude.\n\nLa grâce apaise l''harmonie universelle et révèle la beauté de l''existence. L''amour purifie les liens qui nous unissent en chaque instant de la vie.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0113',
  '2026-03-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0113' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0113' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [114] seed-test-0114
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu invite à découvrir la vibration de l''amour et ouvre la porte du pardon. Le chemin intérieur habite la profondeur du souffle en chaque instant de la vie. La conscience habite les liens qui nous unissent et invite à la gratitude.\n\nL''amour élève les profondeurs de l''être si l''on accepte de lâcher-prise. La miséricorde révèle notre dimension invisible quand on s''y abandonne avec foi. La grâce habite la relation à la Source dans la douceur du présent. La vérité intérieure libère la vibration de l''amour avec une infinie tendresse.\n\nLe souffle de Dieu nourrit l''appel de la conscience et révèle la beauté de l''existence. Le chemin intérieur embrasse les zones d''ombre en nous là où le mental s''efface. Le cœur élève l''harmonie universelle avec une infinie tendresse. Le chemin intérieur ouvre la profondeur du souffle avec une infinie tendresse.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0114',
  '2026-05-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0114' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0114' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [115] seed-test-0115
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine libère le chemin vers la lumière quand on s''y abandonne avec foi. L''âme purifie notre monde intérieur et révèle la beauté de l''existence. La conscience transforme les résistances de l''ego au-delà de toute souffrance.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0115',
  '2026-04-01'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0115' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0115' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;

-- [116] seed-test-0116
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit illumine les profondeurs de l''être avec une infinie tendresse.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0116',
  '2026-05-10'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0116' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0116' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [117] seed-test-0117
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le silence appelle vers les zones d''ombre en nous en chaque instant de la vie. La grâce appelle vers notre dimension invisible là où le mental s''efface.\n\nLa paix intérieure guérit l''espace du cœur dans la douceur du présent. Chaque être libère l''harmonie universelle en chaque instant de la vie. La foi guérit la vérité de notre nature et invite à la gratitude.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0117',
  '2026-04-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0117' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0117' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;

-- [118] seed-test-0118
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur révèle la vérité de notre nature là où le mental s''efface. La vérité intérieure apaise la profondeur du souffle avec une infinie tendresse.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Lois universelles et plans de conscience'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0118',
  '2026-02-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0118' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0118' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [119] seed-test-0119
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse touche en profondeur les résistances de l''ego et invite à la gratitude. Le cœur habite les profondeurs de l''être en chaque instant de la vie.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0119',
  '2026-06-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0119' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0119' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;

-- [120] seed-test-0120
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure accompagne la vérité de notre nature avec une infinie tendresse. Le souffle de Dieu accompagne l''appel de la conscience quand on s''y abandonne avec foi.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0120',
  '2026-06-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0120' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0120' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [121] seed-test-0121
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour guérit l''espace du cœur au-delà de toute souffrance.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0121',
  '2026-05-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0121' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0121' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [122] seed-test-0122
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur libère l''espace du cœur avec une infinie tendresse.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0122',
  '2026-02-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0122' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0122' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;

-- [123] seed-test-0123
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière nourrit les zones d''ombre en nous dans la douceur du présent. La présence divine accompagne l''espace du cœur là où le mental s''efface.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0123',
  '2026-01-10'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0123' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0123' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [124] seed-test-0124
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière ouvre les liens qui nous unissent et révèle la beauté de l''existence. La miséricorde touche en profondeur notre monde intérieur dans la douceur du présent.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0124',
  '2026-01-12'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0124' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0124' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [125] seed-test-0125
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit accompagne l''appel de la conscience et ouvre la porte du pardon. La miséricorde libère les résistances de l''ego avec une infinie tendresse. Le cœur accompagne les zones d''ombre en nous quand on s''y abandonne avec foi.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0125',
  '2026-03-16'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0125' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0125' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;

-- [126] seed-test-0126
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse révèle notre dimension invisible et révèle la beauté de l''existence. La prière traverse notre dimension invisible en chaque instant de la vie. Le chemin intérieur purifie la vibration de l''amour et ouvre la porte du pardon.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0126',
  '2026-01-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0126' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0126' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

-- [127] seed-test-0127
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit élève notre dimension invisible là où le mental s''efface. Le regard de Dieu purifie la vibration de l''amour là où le mental s''efface. Le cœur accompagne l''espace du cœur si l''on accepte de lâcher-prise.\n\nLe chemin intérieur libère l''espace du cœur dans la douceur du présent. La sagesse accompagne l''espace du cœur et ouvre la porte du pardon. La vérité intérieure purifie les résistances de l''ego avec une infinie tendresse. Le cœur touche en profondeur les profondeurs de l''être et révèle la beauté de l''existence.\n\nLa grâce embrasse l''appel de la conscience si l''on accepte de lâcher-prise. La prière révèle la vérité de notre nature et révèle la beauté de l''existence. La présence divine rayonne vers la relation à la Source si l''on accepte de lâcher-prise. La présence divine révèle l''appel de la conscience dans la douceur du présent.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0127',
  '2026-05-16'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0127' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0127' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [128] seed-test-0128
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde transforme l''appel de la conscience là où le mental s''efface.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0128',
  '2026-05-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0128' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0128' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [129] seed-test-0129
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu transforme les résistances de l''ego dans la douceur du présent. Le souffle de Dieu révèle le chemin vers la lumière et invite à la gratitude.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0129',
  '2026-02-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0129' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0129' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [130] seed-test-0130
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La paix intérieure embrasse l''appel de la conscience au-delà de toute souffrance. La douceur de Dieu élève l''espace du cœur et invite à la gratitude. Le chemin intérieur apaise notre dimension invisible dans la douceur du présent.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0130',
  '2026-06-05'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0130' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0130' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [131] seed-test-0131
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur traverse la vibration de l''amour et ouvre la porte du pardon. Chaque être embrasse l''espace du cœur et ouvre la porte du pardon. La foi transforme l''appel de la conscience et ouvre la porte du pardon. L''âme habite la vérité de notre nature et ouvre la porte du pardon.\n\nLe cœur libère notre monde intérieur quand on s''y abandonne avec foi. La miséricorde ouvre l''espace du cœur avec une infinie tendresse. L''esprit embrasse la relation à la Source dans la douceur du présent. Le cœur ouvre la vérité de notre nature dans la douceur du présent.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0131',
  '2026-06-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0131' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0131' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [132] seed-test-0132
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit accompagne les profondeurs de l''être en chaque instant de la vie.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0132',
  '2026-06-26'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0132' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0132' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [133] seed-test-0133
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience habite la relation à la Source et révèle la beauté de l''existence. Le silence nourrit la vérité de notre nature et révèle la beauté de l''existence.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0133',
  '2026-03-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0133' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0133' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [134] seed-test-0134
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience traverse le silence sacré et révèle la beauté de l''existence.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0134',
  '2026-06-23'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0134' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0134' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [135] seed-test-0135
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu apaise la relation à la Source si l''on accepte de lâcher-prise. Le silence ouvre l''espace du cœur quand on s''y abandonne avec foi.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0135',
  '2026-04-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0135' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0135' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [136] seed-test-0136
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le cœur invite à découvrir la vérité de notre nature avec une infinie tendresse. Le cœur touche en profondeur les zones d''ombre en nous et révèle la beauté de l''existence. La foi élève les zones d''ombre en nous là où le mental s''efface.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0136',
  '2026-05-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0136' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0136' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [137] seed-test-0137
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce accompagne notre monde intérieur avec une infinie tendresse.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0137',
  '2026-04-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0137' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0137' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [138] seed-test-0138
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure illumine l''appel de la conscience en chaque instant de la vie. La foi transforme notre dimension invisible en chaque instant de la vie.\n\nLa foi ouvre l''appel de la conscience et révèle la beauté de l''existence. La vérité intérieure invite à découvrir notre monde intérieur avec une infinie tendresse. Le silence apaise notre dimension invisible avec une infinie tendresse. La conscience touche en profondeur le silence sacré et invite à la gratitude.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0138',
  '2026-04-18'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0138' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0138' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [139] seed-test-0139
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour rayonne vers le silence sacré et invite à la gratitude.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0139',
  '2026-03-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0139' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0139' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [140] seed-test-0140
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure traverse le silence sacré au-delà de toute souffrance. L''esprit ouvre les résistances de l''ego quand on s''y abandonne avec foi.\n\nLa grâce transforme les résistances de l''ego là où le mental s''efface. La miséricorde nourrit les résistances de l''ego avec une infinie tendresse.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0140',
  '2026-06-10'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0140' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0140' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [141] seed-test-0141
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine révèle la profondeur du souffle et invite à la gratitude. La sagesse élève l''harmonie universelle quand on s''y abandonne avec foi.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0141',
  '2026-06-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0141' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0141' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [142] seed-test-0142
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse révèle les liens qui nous unissent et révèle la beauté de l''existence. La prière guérit les liens qui nous unissent avec une infinie tendresse. La sagesse traverse la vibration de l''amour et révèle la beauté de l''existence. Le souffle de Dieu illumine le silence sacré et ouvre la porte du pardon.\n\nChaque être traverse le silence sacré et ouvre la porte du pardon. La miséricorde accompagne la relation à la Source dans la douceur du présent. La grâce invite à découvrir notre dimension invisible là où le mental s''efface. La foi habite notre monde intérieur au-delà de toute souffrance.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0142',
  '2026-04-26'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0142' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0142' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;

-- [143] seed-test-0143
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être illumine le chemin vers la lumière quand on s''y abandonne avec foi.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0143',
  '2026-01-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0143' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0143' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [144] seed-test-0144
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le cœur nourrit le chemin vers la lumière là où le mental s''efface.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0144',
  '2026-03-22'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0144' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0144' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [145] seed-test-0145
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit guérit l''harmonie universelle et ouvre la porte du pardon. L''âme purifie la vibration de l''amour et ouvre la porte du pardon.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0145',
  '2026-02-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0145' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0145' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

-- [146] seed-test-0146
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit élève la vibration de l''amour et ouvre la porte du pardon. L''amour accompagne le chemin vers la lumière et ouvre la porte du pardon.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0146',
  '2026-03-10'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0146' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0146' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [147] seed-test-0147
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière appelle vers les résistances de l''ego et invite à la gratitude. Le regard de Dieu ouvre la vibration de l''amour là où le mental s''efface.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Lois universelles et plans de conscience'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0147',
  '2026-06-24'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0147' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0147' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [148] seed-test-0148
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière apaise les zones d''ombre en nous et ouvre la porte du pardon. La vérité intérieure accompagne l''espace du cœur dans la douceur du présent.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0148',
  '2026-02-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0148' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0148' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [149] seed-test-0149
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''âme rayonne vers la relation à la Source avec une infinie tendresse. Le regard de Dieu appelle vers la relation à la Source dans la douceur du présent. La foi transforme l''appel de la conscience en chaque instant de la vie.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0149',
  '2026-01-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0149' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0149' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;

-- [150] seed-test-0150
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le souffle de Dieu élève les liens qui nous unissent au-delà de toute souffrance. L''esprit traverse notre monde intérieur quand on s''y abandonne avec foi. Le chemin intérieur guérit les profondeurs de l''être au-delà de toute souffrance.\n\nL''âme nourrit la relation à la Source et invite à la gratitude. La lumière accompagne notre monde intérieur si l''on accepte de lâcher-prise.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0150',
  '2026-05-25'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0150' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0150' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [151] seed-test-0151
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde touche en profondeur les résistances de l''ego quand on s''y abandonne avec foi.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0151',
  '2026-03-03'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0151' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0151' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

-- [152] seed-test-0152
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La paix intérieure guérit notre dimension invisible dans la douceur du présent.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0152',
  '2026-02-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0152' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0152' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [153] seed-test-0153
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être transforme notre dimension invisible quand on s''y abandonne avec foi. Le silence illumine l''harmonie universelle quand on s''y abandonne avec foi.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0153',
  '2026-02-16'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0153' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0153' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [154] seed-test-0154
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience élève l''harmonie universelle si l''on accepte de lâcher-prise. Le silence illumine l''espace du cœur dans la douceur du présent.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0154',
  '2026-01-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0154' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0154' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [155] seed-test-0155
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière invite à découvrir le silence sacré au-delà de toute souffrance. Le cœur traverse les zones d''ombre en nous si l''on accepte de lâcher-prise. Le silence apaise la relation à la Source avec une infinie tendresse.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0155',
  '2026-01-08'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0155' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0155' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [156] seed-test-0156
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine ouvre la profondeur du souffle et invite à la gratitude. La miséricorde révèle la relation à la Source là où le mental s''efface. L''amour révèle la profondeur du souffle là où le mental s''efface.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0156',
  '2026-01-19'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0156' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0156' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [157] seed-test-0157
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour appelle vers les profondeurs de l''être dans la douceur du présent. La prière embrasse le silence sacré si l''on accepte de lâcher-prise.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0157',
  '2026-03-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0157' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0157' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [158] seed-test-0158
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience purifie notre dimension invisible au-delà de toute souffrance. La foi libère la vibration de l''amour là où le mental s''efface.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0158',
  '2026-02-24'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0158' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0158' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [159] seed-test-0159
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''âme libère notre monde intérieur là où le mental s''efface.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0159',
  '2026-06-01'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0159' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0159' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [160] seed-test-0160
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu libère les liens qui nous unissent et révèle la beauté de l''existence. La lumière élève l''harmonie universelle si l''on accepte de lâcher-prise.\n\nLa lumière libère la profondeur du souffle avec une infinie tendresse. L''esprit traverse la vibration de l''amour et ouvre la porte du pardon.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0160',
  '2026-05-05'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0160' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0160' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [161] seed-test-0161
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La foi nourrit le silence sacré là où le mental s''efface. La paix intérieure habite l''espace du cœur et révèle la beauté de l''existence.\n\nL''amour guérit la relation à la Source quand on s''y abandonne avec foi. La vérité intérieure apaise les zones d''ombre en nous et ouvre la porte du pardon. Le cœur embrasse la vibration de l''amour là où le mental s''efface.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0161',
  '2026-05-12'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0161' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0161' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [162] seed-test-0162
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse apaise le chemin vers la lumière quand on s''y abandonne avec foi. La foi transforme la relation à la Source là où le mental s''efface. La présence divine guérit l''harmonie universelle en chaque instant de la vie.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Harmonie et communication'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0162',
  '2026-05-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0162' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0162' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [163] seed-test-0163
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être touche en profondeur l''harmonie universelle avec une infinie tendresse. L''amour apaise la vibration de l''amour et ouvre la porte du pardon. La présence divine apaise les profondeurs de l''être et invite à la gratitude.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0163',
  '2026-02-05'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0163' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0163' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [164] seed-test-0164
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure nourrit la profondeur du souffle et ouvre la porte du pardon. L''âme guérit la relation à la Source et révèle la beauté de l''existence.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0164',
  '2026-01-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0164' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0164' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [165] seed-test-0165
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le cœur révèle le silence sacré dans la douceur du présent. Le chemin intérieur illumine les liens qui nous unissent dans la douceur du présent.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0165',
  '2026-02-06'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0165' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0165' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [166] seed-test-0166
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu libère la vérité de notre nature si l''on accepte de lâcher-prise. Le chemin intérieur révèle la profondeur du souffle avec une infinie tendresse. Le chemin intérieur transforme le chemin vers la lumière si l''on accepte de lâcher-prise. La paix intérieure élève les liens qui nous unissent en chaque instant de la vie.\n\nLa douceur de Dieu libère la vérité de notre nature avec une infinie tendresse. L''âme accompagne l''appel de la conscience là où le mental s''efface. Le chemin intérieur touche en profondeur l''appel de la conscience et révèle la beauté de l''existence. La conscience appelle vers l''espace du cœur dans la douceur du présent.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0166',
  '2026-01-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0166' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0166' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [167] seed-test-0167
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu traverse l''appel de la conscience au-delà de toute souffrance. L''amour ouvre le chemin vers la lumière en chaque instant de la vie. L''amour nourrit notre monde intérieur et invite à la gratitude.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Lois universelles et plans de conscience'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0167',
  '2026-05-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0167' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0167' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [168] seed-test-0168
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour habite l''appel de la conscience là où le mental s''efface.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0168',
  '2026-06-23'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0168' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0168' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;

-- [169] seed-test-0169
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure purifie le silence sacré et révèle la beauté de l''existence.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0169',
  '2026-02-16'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0169' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0169' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [170] seed-test-0170
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour illumine notre monde intérieur et révèle la beauté de l''existence. L''âme habite la profondeur du souffle au-delà de toute souffrance. La grâce élève l''espace du cœur quand on s''y abandonne avec foi. Le souffle de Dieu transforme les profondeurs de l''être quand on s''y abandonne avec foi.\n\nLa présence divine apaise le silence sacré avec une infinie tendresse. La conscience guérit l''espace du cœur dans la douceur du présent. La vérité intérieure apaise l''espace du cœur si l''on accepte de lâcher-prise. Le souffle de Dieu élève les zones d''ombre en nous dans la douceur du présent.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0170',
  '2026-04-21'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0170' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0170' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [171] seed-test-0171
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour ouvre les liens qui nous unissent si l''on accepte de lâcher-prise.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0171',
  '2026-03-05'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0171' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0171' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [172] seed-test-0172
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La lumière ouvre les résistances de l''ego là où le mental s''efface. Le regard de Dieu libère la vérité de notre nature au-delà de toute souffrance. Le silence invite à découvrir les zones d''ombre en nous là où le mental s''efface. La prière libère l''espace du cœur là où le mental s''efface.\n\nLa prière habite la vibration de l''amour et invite à la gratitude. La sagesse purifie la relation à la Source et ouvre la porte du pardon.\n\nLa sagesse apaise l''harmonie universelle et invite à la gratitude. La lumière accompagne la vibration de l''amour dans la douceur du présent. Le cœur révèle la vibration de l''amour dans la douceur du présent.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0172',
  '2026-04-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0172' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0172' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;

-- [173] seed-test-0173
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Chaque être guérit l''appel de la conscience et invite à la gratitude.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0173',
  '2026-03-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0173' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0173' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;

-- [174] seed-test-0174
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le cœur accompagne les zones d''ombre en nous et ouvre la porte du pardon.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0174',
  '2026-03-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0174' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0174' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;

-- [175] seed-test-0175
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu révèle les zones d''ombre en nous et invite à la gratitude.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0175',
  '2026-02-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0175' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0175' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;

-- [176] seed-test-0176
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''amour apaise les profondeurs de l''être dans la douceur du présent. La vérité intérieure touche en profondeur le silence sacré et révèle la beauté de l''existence. La présence divine transforme l''espace du cœur et invite à la gratitude.\n\nLa prière rayonne vers le silence sacré au-delà de toute souffrance. Le chemin intérieur purifie le chemin vers la lumière et invite à la gratitude. La grâce ouvre la vérité de notre nature si l''on accepte de lâcher-prise.\n\nLe chemin intérieur apaise notre dimension invisible dans la douceur du présent. Le chemin intérieur invite à découvrir la profondeur du souffle si l''on accepte de lâcher-prise.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0176',
  '2026-05-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0176' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0176' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [177] seed-test-0177
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience ouvre la vibration de l''amour et invite à la gratitude.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0177',
  '2026-04-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0177' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0177' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [178] seed-test-0178
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine apaise le chemin vers la lumière là où le mental s''efface. La miséricorde révèle l''appel de la conscience au-delà de toute souffrance.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0178',
  '2026-01-27'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0178' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0178' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;

-- [179] seed-test-0179
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La vérité intérieure libère la vibration de l''amour si l''on accepte de lâcher-prise. La prière accompagne la profondeur du souffle et invite à la gratitude. La douceur de Dieu appelle vers l''appel de la conscience au-delà de toute souffrance.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0179',
  '2026-02-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0179' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0179' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'service' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;

-- [180] seed-test-0180
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce élève les profondeurs de l''être dans la douceur du présent.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0180',
  '2026-04-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0180' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0180' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [181] seed-test-0181
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La paix intérieure touche en profondeur les liens qui nous unissent avec une infinie tendresse. Le souffle de Dieu nourrit notre monde intérieur et révèle la beauté de l''existence.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0181',
  '2026-06-20'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0181' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0181' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [182] seed-test-0182
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La présence divine élève les résistances de l''ego au-delà de toute souffrance.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0182',
  '2026-01-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0182' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0182' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lumière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'lâcher-prise' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;

-- [183] seed-test-0183
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit nourrit les liens qui nous unissent et révèle la beauté de l''existence.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Purification et détachement'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0183',
  '2026-04-02'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0183' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0183' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [184] seed-test-0184
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu accompagne les profondeurs de l''être dans la douceur du présent. Le souffle de Dieu libère les profondeurs de l''être et révèle la beauté de l''existence.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Guérison et équilibre'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0184',
  '2026-01-11'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0184' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0184' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;

-- [185] seed-test-0185
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le silence libère les zones d''ombre en nous si l''on accepte de lâcher-prise.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0185',
  '2026-03-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0185' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0185' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'conscience' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;

-- [186] seed-test-0186
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''esprit invite à découvrir l''appel de la conscience avec une infinie tendresse. La conscience transforme notre monde intérieur quand on s''y abandonne avec foi.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0186',
  '2026-06-17'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0186' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0186' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [187] seed-test-0187
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce purifie le silence sacré et invite à la gratitude. L''amour transforme la vibration de l''amour et invite à la gratitude.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0187',
  '2026-02-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0187' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0187' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;

-- [188] seed-test-0188
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''âme libère l''espace du cœur et révèle la beauté de l''existence. Le regard de Dieu embrasse les zones d''ombre en nous et révèle la beauté de l''existence.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0188',
  '2026-03-12'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0188' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0188' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [189] seed-test-0189
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''âme accompagne les profondeurs de l''être quand on s''y abandonne avec foi. La vérité intérieure purifie le silence sacré en chaque instant de la vie. L''amour purifie notre dimension invisible dans la douceur du présent.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Communion et service'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0189',
  '2026-06-01'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0189' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0189' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'pardon' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [190] seed-test-0190
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le regard de Dieu rayonne vers l''harmonie universelle si l''on accepte de lâcher-prise. L''esprit accompagne le silence sacré là où le mental s''efface. Chaque être nourrit la relation à la Source et révèle la beauté de l''existence.\n\nLa douceur de Dieu accompagne les résistances de l''ego et ouvre la porte du pardon. L''âme appelle vers la vérité de notre nature là où le mental s''efface. La miséricorde rayonne vers notre dimension invisible et ouvre la porte du pardon.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0190',
  '2026-03-09'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0190' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0190' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'foi' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [191] seed-test-0191
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu libère la profondeur du souffle et invite à la gratitude. Le regard de Dieu accompagne la vérité de notre nature là où le mental s''efface.\n\nLa présence divine illumine la vérité de notre nature et révèle la beauté de l''existence. La foi nourrit la profondeur du souffle dans la douceur du présent. La paix intérieure accompagne l''harmonie universelle et invite à la gratitude. La vérité intérieure purifie l''espace du cœur en chaque instant de la vie.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0191',
  '2026-06-26'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0191' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0191' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'sagesse' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [192] seed-test-0192
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La miséricorde ouvre notre dimension invisible et ouvre la porte du pardon. Le chemin intérieur élève l''harmonie universelle si l''on accepte de lâcher-prise.',
  @oeuvre_atllulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0192',
  '2026-05-25'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0192' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0192' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'prière' AND @cit IS NOT NULL;

-- [193] seed-test-0193
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La conscience libère l''harmonie universelle si l''on accepte de lâcher-prise. L''esprit habite l''espace du cœur si l''on accepte de lâcher-prise.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Symboles et correspondances'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0193',
  '2026-04-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0193' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0193' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'âme' AND @cit IS NOT NULL;

-- [194] seed-test-0194
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce appelle vers le chemin vers la lumière dans la douceur du présent. La douceur de Dieu rayonne vers les liens qui nous unissent et invite à la gratitude. La présence divine élève la relation à la Source là où le mental s''efface.\n\nLa vérité intérieure embrasse les zones d''ombre en nous là où le mental s''efface. Le cœur guérit la vibration de l''amour là où le mental s''efface. Le cœur habite la vérité de notre nature et invite à la gratitude.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0194',
  '2026-03-07'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0194' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0194' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'grâce' AND @cit IS NOT NULL;

-- [195] seed-test-0195
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'Le chemin intérieur guérit les zones d''ombre en nous au-delà de toute souffrance.',
  @oeuvre_gdnlulu,
  (SELECT id FROM themes WHERE nom = 'Chemin et relation à Dieu'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0195',
  '2026-04-13'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0195' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0195' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'esprit' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'silence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [196] seed-test-0196
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La grâce traverse les profondeurs de l''être là où le mental s''efface. La douceur de Dieu purifie les profondeurs de l''être et invite à la gratitude. L''amour libère l''harmonie universelle là où le mental s''efface. La foi élève le chemin vers la lumière dans la douceur du présent.\n\nLa vérité intérieure rayonne vers les zones d''ombre en nous et ouvre la porte du pardon. La lumière rayonne vers notre dimension invisible et révèle la beauté de l''existence. La douceur de Dieu appelle vers l''espace du cœur dans la douceur du présent. La présence divine habite la profondeur du souffle et révèle la beauté de l''existence.',
  @oeuvre_dirlulu,
  (SELECT id FROM themes WHERE nom = 'Relations humaines et vie concrète'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0196',
  '2026-02-06'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0196' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0196' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'gratitude' AND @cit IS NOT NULL;

-- [197] seed-test-0197
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'L''âme appelle vers les zones d''ombre en nous et ouvre la porte du pardon. La conscience transforme les liens qui nous unissent si l''on accepte de lâcher-prise.\n\nLe regard de Dieu transforme les résistances de l''ego et invite à la gratitude. Le silence illumine les profondeurs de l''être et ouvre la porte du pardon. L''esprit embrasse les liens qui nous unissent et ouvre la porte du pardon. La miséricorde nourrit la vibration de l''amour quand on s''y abandonne avec foi.',
  @oeuvre_ebklulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_reviser,
  'Lulumineuse',
  'seed-test-0197',
  '2026-06-21'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0197' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0197' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

-- [198] seed-test-0198
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La douceur de Dieu nourrit les résistances de l''ego au-delà de toute souffrance. La présence divine révèle le silence sacré et ouvre la porte du pardon. La douceur de Dieu apaise notre dimension invisible et ouvre la porte du pardon. Le silence invite à découvrir la relation à la Source au-delà de toute souffrance.\n\nLa sagesse appelle vers la relation à la Source là où le mental s''efface. L''esprit rayonne vers les zones d''ombre en nous et invite à la gratitude.',
  @oeuvre_prtlulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0198',
  '2026-02-23'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0198' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0198' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'Dieu' AND @cit IS NOT NULL;

-- [199] seed-test-0199
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La prière apaise le silence sacré au-delà de toute souffrance. Le chemin intérieur élève le chemin vers la lumière avec une infinie tendresse.',
  @oeuvre_tglulu,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_publiee,
  'Lulumineuse',
  'seed-test-0199',
  '2026-06-04'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0199' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0199' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'méditation' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'amour' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'présence' AND @cit IS NOT NULL;

-- [200] seed-test-0200
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)
SELECT 'La sagesse embrasse les profondeurs de l''être et ouvre la porte du pardon.',
  @oeuvre_artlulu,
  (SELECT id FROM themes WHERE nom = 'Grâce et rédemption'),
  @etat_corriger,
  'Lulumineuse',
  'seed-test-0200',
  '2026-01-28'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = 'seed-test-0200' AND deleted_at IS NULL);
SET @cit = (SELECT id FROM citations WHERE source_item_id = 'seed-test-0200' AND deleted_at IS NULL);

INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'cœur' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'paix' AND @cit IS NOT NULL;
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
  SELECT @cit, id FROM keywords WHERE mot = 'vérité' AND @cit IS NOT NULL;

COMMIT;
