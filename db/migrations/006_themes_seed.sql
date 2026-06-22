-- ─────────────────────────────────────────────────────────────────────
-- SEED 006 — Référentiel thèmes/sous-thèmes Lumosphère
-- Source : docs/themes-lumosphere.md
-- 4 thèmes racine + 12 sous-thèmes = 16 entrées
-- Idempotent : INSERT IGNORE (appliquer plusieurs fois = même résultat)
-- ─────────────────────────────────────────────────────────────────────

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Thèmes racine (parent_id IS NULL)
INSERT IGNORE INTO themes (id, nom, parent_id, chemin, description) VALUES
(1, 'Chemin et relation à Dieu', NULL,
   'Chemin et relation à Dieu',
   'Le lien vivant avec le divin, la foi, la prière et le service du bien.'),
(2, 'Connaissance et vision du monde', NULL,
   'Connaissance et vision du monde',
   'Explorer les lois de la vie, la structure invisible de l\'univers et le sens du parcours de l\'âme.'),
(3, 'Relations humaines et vie concrète', NULL,
   'Relations humaines et vie concrète',
   'Appliquer la conscience spirituelle dans la vie de tous les jours et dans les relations.'),
(4, 'Vie intérieure et transformation personnelle', NULL,
   'Vie intérieure et transformation personnelle',
   'Tout ce qui aide à mieux se connaître, à se libérer de ses blocages et à faire grandir la lumière intérieure.');

-- Sous-thèmes de "Chemin et relation à Dieu" (parent_id = 1)
INSERT IGNORE INTO themes (id, nom, parent_id, chemin, description) VALUES
(5,  'Communion et service', 1,
    'Chemin et relation à Dieu/Communion et service',
    'Agir avec amour pour les autres, voir Dieu dans tout ce qui vit.'),
(6,  'Foi et prière', 1,
    'Chemin et relation à Dieu/Foi et prière',
    'Nourrir sa relation à Dieu ou à la Source par la prière, la méditation, la confiance.'),
(7,  'Grâce et rédemption', 1,
    'Chemin et relation à Dieu/Grâce et rédemption',
    'Comprendre la miséricorde, le pardon, et la possibilité de se renouveler.');

-- Sous-thèmes de "Connaissance et vision du monde" (parent_id = 2)
INSERT IGNORE INTO themes (id, nom, parent_id, chemin, description) VALUES
(8,  'Lois universelles et plans de conscience', 2,
    'Connaissance et vision du monde/Lois universelles et plans de conscience',
    'Comprendre comment les différents niveaux d\'existence s\'influencent (physique, émotionnel, spirituel…).'),
(9,  'Symboles et correspondances', 2,
    'Connaissance et vision du monde/Symboles et correspondances',
    'Lire le monde comme un langage de signes : couleurs, nombres, planètes, éléments, etc.'),
(10, 'Évolution de l\'âme et sens de la vie', 2,
    'Connaissance et vision du monde/Évolution de l\'âme et sens de la vie',
    'Réfléchir à la destinée de l\'âme, sa croissance, ses incarnations et sa mission.');

-- Sous-thèmes de "Relations humaines et vie concrète" (parent_id = 3)
INSERT IGNORE INTO themes (id, nom, parent_id, chemin, description) VALUES
(11, 'Guérison et équilibre', 3,
    'Relations humaines et vie concrète/Guérison et équilibre',
    'Soigner le corps, le cœur et l\'esprit pour retrouver l\'unité intérieure.'),
(12, 'Harmonie et communication', 3,
    'Relations humaines et vie concrète/Harmonie et communication',
    'Créer des liens justes, respectueux, empreints d\'écoute et de bienveillance.'),
(13, 'Présence consciente dans l\'action', 3,
    'Relations humaines et vie concrète/Présence consciente dans l\'action',
    'Vivre chaque acte, chaque moment avec attention, simplicité et amour.');

-- Sous-thèmes de "Vie intérieure et transformation personnelle" (parent_id = 4)
INSERT IGNORE INTO themes (id, nom, parent_id, chemin, description) VALUES
(14, 'Connaissance de soi', 4,
    'Vie intérieure et transformation personnelle/Connaissance de soi',
    'Comprendre son fonctionnement intérieur, ses pensées, émotions, forces et limites.'),
(15, 'Ouverture à la lumière et à la présence divine', 4,
    'Vie intérieure et transformation personnelle/Ouverture à la lumière et à la présence divine',
    'Apprendre à accueillir la paix, la clarté et la présence divine en soi.'),
(16, 'Purification et détachement', 4,
    'Vie intérieure et transformation personnelle/Purification et détachement',
    'Se libérer de ce qui pèse : émotions, peurs, attachements, habitudes.');

SET FOREIGN_KEY_CHECKS = 1;
