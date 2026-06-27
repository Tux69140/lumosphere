# T10 — Seed données de test corpus — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplir la base `mist2786_lumosphere` avec ~106 citations de test (6 vraies + 100 générées), réparties sur 7 œuvres, les thèmes/sous-thèmes existants, 20 mots-clés et 3 états, afin de débloquer les tâches T12 (affichage) et T13 (recherche).

**Architecture:** Un générateur Python stdlib-only (`generate_citations.py`) produit un fichier SQL auto-suffisant (`seed_citations_generated.sql`) via stdout redirect. Le seed existant (`seed_citations_test.sql`) est mis à jour pour renommer l'œuvre "Telegram Lulumineuse" → "Telegram" (cohérence avec les 7 noms canoniques). Les deux fichiers sont idempotents et transactionnels ; on les exécute séquentiellement sur le serveur. Un script de vérification (`008_verify_seed_corpus.sql`) confirme les comptages attendus.

**Tech Stack:** Python 3 (stdlib uniquement : `random`, `sys`) · SQL MySQL/MariaDB · SSH o2switch

## Global Constraints

- Python 3 stdlib uniquement (pas de `pip install`) — cohérent avec les workers du projet.
- Tirage reproductible : `random.seed(42)` posé avant tout appel `random.*`.
- Idempotence obligatoire : relancer les seeds ne crée aucun doublon.
- Transaction (`START TRANSACTION` / `COMMIT`) : tout-ou-rien.
- Collation `utf8mb4_unicode_520_ci` déjà en place — aucune modification de schéma.
- Colonnes `citation_keywords` : PK composite `(citation_id, keyword_id)` — utiliser `INSERT IGNORE`.
- `telegram_message_id` réservé aux vraies citations Telegram ; les générées utilisent `source_item_id` (`seed-test-0001` … `seed-test-0100`).
- Commit seulement sur demande explicite du chef de projet.

---

## Structure des fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `db/seeds/generate_citations.py` | **CREATE** | Générateur Python → SQL stdout |
| `db/seeds/seed_citations_generated.sql` | **CREATE** | 100 citations générées (output du générateur, commité) |
| `db/seeds/seed_citations_test.sql` | **MODIFY** | Renommer "Telegram Lulumineuse" → "Telegram" |
| `db/verify/008_verify_seed_corpus.sql` | **CREATE** | Requêtes de vérification post-seed |

---

## Task 1 : Générateur Python + correction du seed existant

**Files:**
- Create: `db/seeds/generate_citations.py`
- Create: `db/seeds/seed_citations_generated.sql` (output du générateur)
- Modify: `db/seeds/seed_citations_test.sql` (renommage oeuvre)

**Interfaces:**
- Consumes: tables `auteurs`, `oeuvres`, `etats`, `themes`, `citations`, `keywords`, `citation_keywords` (migration 003 + 006)
- Produces:
  - `seed_citations_generated.sql` : 100 `INSERT … WHERE NOT EXISTS` + liaisons `citation_keywords`
  - Oeuvre "Telegram" en base (renommée depuis "Telegram Lulumineuse")

- [ ] **Étape 1 : Renommer l'œuvre dans seed_citations_test.sql**

Ouvrir `db/seeds/seed_citations_test.sql` et effectuer ces deux remplacements (lignes ~17-21) :

```sql
-- AVANT
INSERT INTO oeuvres (auteur_id, nom, abreviation)
SELECT @auteur_id, 'Telegram Lulumineuse', 'TgLulu'
WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = 'Telegram Lulumineuse');

SET @oeuvre_id = (SELECT id FROM oeuvres WHERE nom = 'Telegram Lulumineuse');

-- APRÈS
INSERT INTO oeuvres (auteur_id, nom, abreviation)
SELECT @auteur_id, 'Telegram', 'TgLulu'
WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = 'Telegram');

SET @oeuvre_id = (SELECT id FROM oeuvres WHERE nom = 'Telegram');
```

- [ ] **Étape 2 : Écrire le générateur `db/seeds/generate_citations.py`**

```python
#!/usr/bin/env python3
"""
Génère db/seeds/seed_citations_generated.sql
Usage : python3 db/seeds/generate_citations.py > db/seeds/seed_citations_generated.sql
"""
import random

SEED = 42
N = 100
random.seed(SEED)

# ── Lexique ───────────────────────────────────────────────────────────────────
SUJETS = [
    "L'âme", "La lumière", "La prière", "Le silence", "La présence divine",
    "Le cœur", "La grâce", "L'amour", "La sagesse", "La foi",
    "Le souffle de Dieu", "La conscience", "La paix intérieure", "L'esprit",
    "Chaque être", "Le chemin intérieur", "La douceur de Dieu",
    "La miséricorde", "La vérité intérieure", "Le regard de Dieu",
]
VERBES = [
    "illumine", "transforme", "guérit", "apaise", "élève",
    "ouvre", "purifie", "libère", "nourrit", "rayonne vers",
    "habite", "traverse", "accompagne", "révèle", "embrasse",
    "invite à découvrir", "appelle vers", "touche en profondeur",
]
COMPLEMENTS = [
    "les profondeurs de l'être",
    "le chemin vers la lumière",
    "les zones d'ombre en nous",
    "la relation à la Source",
    "notre dimension invisible",
    "l'espace du cœur",
    "les liens qui nous unissent",
    "la vibration de l'amour",
    "notre monde intérieur",
    "les résistances de l'ego",
    "la vérité de notre nature",
    "l'harmonie universelle",
    "l'appel de la conscience",
    "le silence sacré",
    "la profondeur du souffle",
]
FINALES = [
    "et invite à la gratitude.",
    "et ouvre la porte du pardon.",
    "quand on s'y abandonne avec foi.",
    "en chaque instant de la vie.",
    "si l'on accepte de lâcher-prise.",
    "là où le mental s'efface.",
    "dans la douceur du présent.",
    "et révèle la beauté de l'existence.",
    "avec une infinie tendresse.",
    "au-delà de toute souffrance.",
]

def phrase_simple():
    return (
        f"{random.choice(SUJETS)} {random.choice(VERBES)} "
        f"{random.choice(COMPLEMENTS)} {random.choice(FINALES)}"
    )

def make_texte(longueur):
    if longueur == "court":
        return phrase_simple()
    elif longueur == "moyen":
        return " ".join(phrase_simple() for _ in range(random.randint(2, 3)))
    else:  # long : 2-3 paragraphes séparés par \n\n (interprété en newline par MySQL)
        paras = [
            " ".join(phrase_simple() for _ in range(random.randint(2, 4)))
            for _ in range(random.randint(2, 3))
        ]
        return "\\n\\n".join(paras)

# ── Référentiel ───────────────────────────────────────────────────────────────
OEUVRES = [
    ("Telegram",  "TgLulu"),
    ("ebook",     "EbkLulu"),
    ("Directs",   "DirLulu"),
    ("Guidance",  "GdnLulu"),
    ("Pratique",  "PrtLulu"),
    ("Atelier",   "AtlLulu"),
    ("Articles",  "ArtLulu"),
]
OEUVRE_NOMS = [o[0] for o in OEUVRES]
OEUVRE_VARS = {nom: f"@oeuvre_{abr.lower()}" for nom, abr in OEUVRES}

THEMES_ALL = [
    # Sous-thèmes (plus spécifiques → utilisés davantage)
    "Communion et service",
    "Foi et prière",
    "Grâce et rédemption",
    "Lois universelles et plans de conscience",
    "Symboles et correspondances",
    "Guérison et équilibre",
    "Harmonie et communication",
    "Connaissance de soi",
    "Ouverture à la lumière et à la présence divine",
    "Purification et détachement",
    # Parents (moins fréquents mais présents)
    "Chemin et relation à Dieu",
    "Connaissance et vision du monde",
    "Relations humaines et vie concrète",
    "Vie intérieure et transformation personnelle",
]

# Distribution états : 60 Publiée / 25 À Corriger / 15 À Réviser
ETATS_DIST = ["Publiée"] * 60 + ["À Corriger"] * 25 + ["À Réviser"] * 15
random.shuffle(ETATS_DIST)
ETAT_VARS = {
    "Publiée":    "@etat_publiee",
    "À Corriger": "@etat_corriger",
    "À Réviser":  "@etat_reviser",
}

# Distribution longueurs : 30 court / 50 moyen / 20 long
LONGUEURS_DIST = ["court"] * 30 + ["moyen"] * 50 + ["long"] * 20
random.shuffle(LONGUEURS_DIST)

KEYWORDS = [
    "Dieu", "âme", "prière", "lumière", "pardon", "grâce",
    "conscience", "méditation", "foi", "présence", "paix",
    "cœur", "silence", "vérité", "amour", "esprit",
    "sagesse", "lâcher-prise", "gratitude", "service",
]

def esc(s):
    return s.replace("'", "''")

# ── Génération SQL ────────────────────────────────────────────────────────────
out = []
out.append("-- ┌──────────────────────────────────────────────────────────────────────────┐")
out.append("-- │ GÉNÉRÉ par db/seeds/generate_citations.py (SEED=42, N=100)              │")
out.append("-- │ NE PAS MODIFIER — régénérer :                                           │")
out.append("-- │   python3 db/seeds/generate_citations.py > db/seeds/seed_citations_generated.sql │")
out.append("-- └──────────────────────────────────────────────────────────────────────────┘")
out.append("")
out.append("START TRANSACTION;")
out.append("")

# Auteur (idempotent)
out.append("-- 1. Auteur")
out.append("INSERT INTO auteurs (nom, site)")
out.append("SELECT 'Lulumineuse', 'https://lulumineuse.com'")
out.append("WHERE NOT EXISTS (SELECT 1 FROM auteurs WHERE nom = 'Lulumineuse');")
out.append("SET @auteur_gen = (SELECT id FROM auteurs WHERE nom = 'Lulumineuse');")
out.append("")

# 7 œuvres (idempotentes)
out.append("-- 2. Œuvres (7 canoniques)")
for nom, abr in OEUVRES:
    var = OEUVRE_VARS[nom]
    out.append(f"INSERT INTO oeuvres (auteur_id, nom, abreviation)")
    out.append(f"SELECT @auteur_gen, '{esc(nom)}', '{abr}'")
    out.append(f"WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = '{esc(nom)}');")
    out.append(f"SET {var} = (SELECT id FROM oeuvres WHERE nom = '{esc(nom)}');")
out.append("")

# Mots-clés
out.append("-- 3. Mots-clés")
out.append("INSERT IGNORE INTO keywords (mot) VALUES")
out.append(",\n".join(f"  ('{esc(kw)}')" for kw in KEYWORDS) + ";")
out.append("")

# Variables états
out.append("-- 4. Variables états")
out.append("SET @etat_publiee  = (SELECT id FROM etats WHERE nom = 'Publiée');")
out.append("SET @etat_corriger = (SELECT id FROM etats WHERE nom = 'À Corriger');")
out.append("SET @etat_reviser  = (SELECT id FROM etats WHERE nom = 'À Réviser');")
out.append("")

# Citations
out.append("-- 5. Citations générées (idempotentes via source_item_id)")
for i in range(N):
    idx = i + 1
    sid = f"seed-test-{idx:04d}"
    contenu = esc(make_texte(LONGUEURS_DIST[i]))
    oeuvre_nom = random.choice(OEUVRE_NOMS)
    oeuvre_var = OEUVRE_VARS[oeuvre_nom]
    theme = random.choice(THEMES_ALL)
    etat = ETATS_DIST[i]
    etat_var = ETAT_VARS[etat]
    date = f"2026-{random.randint(1, 6):02d}-{random.randint(1, 28):02d}"
    kws = random.sample(KEYWORDS, random.randint(2, 4))

    out.append(f"-- [{idx:03d}] {sid}")
    out.append(f"INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, source_item_id, date_entree)")
    out.append(f"SELECT '{contenu}',")
    out.append(f"  {oeuvre_var},")
    out.append(f"  (SELECT id FROM themes WHERE nom = '{esc(theme)}'),")
    out.append(f"  {etat_var},")
    out.append(f"  'Lulumineuse',")
    out.append(f"  '{sid}',")
    out.append(f"  '{date}'")
    out.append(f"WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = '{sid}');")
    # Récupération de l'ID réel (fonctionne que la ligne vienne d'être insérée ou existait déjà)
    out.append(f"SET @cit = (SELECT id FROM citations WHERE source_item_id = '{sid}');")
    out.append("")
    for kw in kws:
        out.append(f"INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)")
        out.append(f"  SELECT @cit, id FROM keywords WHERE mot = '{esc(kw)}' AND @cit IS NOT NULL;")
    out.append("")

out.append("COMMIT;")
print("\n".join(out))
```

- [ ] **Étape 3 : Exécuter le générateur**

```bash
cd /home/stef/Documents/Lulu/lumosphere
python3 db/seeds/generate_citations.py > db/seeds/seed_citations_generated.sql
```

Vérifications rapides sur le fichier produit :

```bash
wc -l db/seeds/seed_citations_generated.sql
# Attendu : ~1 200 à 1 800 lignes

grep -c "seed-test-" db/seeds/seed_citations_generated.sql
# Attendu : 200 (100 INSERT + 100 SET @cit)

grep -c "INSERT IGNORE INTO citation_keywords" db/seeds/seed_citations_generated.sql
# Attendu : entre 200 et 400 (2 à 4 mots-clés par citation)

head -20 db/seeds/seed_citations_generated.sql
# Doit afficher l'en-tête généré + START TRANSACTION

grep "COMMIT" db/seeds/seed_citations_generated.sql
# Doit afficher : COMMIT;
```

- [ ] **Étape 4 : Inspecter visuellement 3 blocs**

```bash
# Bloc d'une citation courte
grep -A 12 "\[001\]" db/seeds/seed_citations_generated.sql | head -15

# Bloc d'une citation longue (chercher \n\n dans le contenu)
grep -m1 "\\\\n\\\\n" db/seeds/seed_citations_generated.sql | cut -c1-120
```

Vérifier que :
- Le `contenu` contient des mots français accentués (âme, lumière, grâce…)
- Les citations longues contiennent bien `\n\n` dans la chaîne SQL
- `source_item_id` est bien présent sous la forme `'seed-test-XXXX'`

---

## Task 2 : Script de vérification + déploiement serveur

**Files:**
- Create: `db/verify/008_verify_seed_corpus.sql`

**Interfaces:**
- Consumes: tables peuplées par `seed_citations_test.sql` + `seed_citations_generated.sql`
- Produces: rapport de comptages confirmant le résultat attendu

- [ ] **Étape 1 : Écrire `db/verify/008_verify_seed_corpus.sql`**

```sql
-- db/verify/008_verify_seed_corpus.sql
-- Vérification post-seed T10 : compter et contrôler les données de test corpus.
-- Usage : mysql mist2786_lumosphere < db/verify/008_verify_seed_corpus.sql

SELECT '=== T10 SEED CORPUS — VÉRIFICATION ===' AS '';

-- Total citations (hors soft-delete)
SELECT 'Total citations' AS test,
       COUNT(*)          AS valeur,
       '≥ 106'           AS attendu
FROM citations WHERE deleted_at IS NULL;

-- Œuvres de Lulumineuse
SELECT 'Œuvres Lulumineuse' AS test,
       COUNT(*)              AS valeur,
       '7'                   AS attendu
FROM oeuvres o
JOIN auteurs a ON o.auteur_id = a.id
WHERE a.nom = 'Lulumineuse';

-- Répartition par état
SELECT 'Citations par état' AS test,
       e.nom                AS detail,
       COUNT(*)             AS valeur
FROM citations c
JOIN etats e ON c.etat_id = e.id
WHERE c.deleted_at IS NULL
GROUP BY e.nom
ORDER BY valeur DESC;

-- Citations sans mots-clés (attendu : 0)
SELECT 'Citations sans mots-clés' AS test,
       COUNT(*)                    AS valeur,
       '0'                         AS attendu
FROM citations c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM citation_keywords ck WHERE ck.citation_id = c.id);

-- Total lignes citation_keywords
SELECT 'Lignes citation_keywords' AS test,
       COUNT(*)                    AS valeur,
       '≥ 200 (2 min par citation)' AS attendu
FROM citation_keywords;

-- Citations générées seed-test-*
SELECT 'Citations seed-test-*' AS test,
       COUNT(*)                 AS valeur,
       '100'                    AS attendu
FROM citations
WHERE source_item_id LIKE 'seed-test-%';

-- TEST FULLTEXT accent-insensible : 'ame' doit remonter des citations contenant 'âme'
SELECT 'FULLTEXT : ame → âme' AS test,
       COUNT(*)                AS valeur,
       '> 0'                   AS attendu
FROM citations
WHERE MATCH(contenu, notes, auteur_nom) AGAINST('ame' IN BOOLEAN MODE)
  AND contenu LIKE '%âme%'
  AND deleted_at IS NULL;

-- Œuvres présentes dans les citations générées (doit afficher les 7)
SELECT 'Œuvres dans citations générées' AS test,
       o.nom                             AS oeuvre,
       COUNT(c.id)                       AS nb_citations
FROM citations c
JOIN oeuvres o ON c.oeuvre_id = o.id
WHERE c.source_item_id LIKE 'seed-test-%'
GROUP BY o.nom
ORDER BY nb_citations DESC;
```

- [ ] **Étape 2 : Déployer sur le serveur**

```bash
# Copier les fichiers modifiés/créés
rsync -avz db/seeds/seed_citations_test.sql db/seeds/seed_citations_generated.sql \
           db/verify/008_verify_seed_corpus.sql \
           lumosphere:/home2/mist2786/lumosphere/db/seeds/
# (ajuster le chemin cible selon l'arborescence réelle du serveur)

# Exécuter les seeds dans l'ordre
ssh lumosphere "mysql mist2786_lumosphere < /home2/mist2786/lumosphere/db/seeds/seed_citations_test.sql"
# Attendu : pas d'erreur, pas de sortie (MySQL silencieux sur succès)

ssh lumosphere "mysql mist2786_lumosphere < /home2/mist2786/lumosphere/db/seeds/seed_citations_generated.sql"
# Attendu : pas d'erreur
```

- [ ] **Étape 3 : Lancer la vérification**

```bash
ssh lumosphere "mysql mist2786_lumosphere < /home2/mist2786/lumosphere/db/seeds/008_verify_seed_corpus.sql"
```

Résultats attendus :

| Test | Valeur attendue |
|---|---|
| Total citations | ≥ 106 |
| Œuvres Lulumineuse | 7 |
| Publiée | ~60 |
| À Corriger | ~25 |
| À Réviser | ~15 |
| Citations sans mots-clés | 0 |
| Lignes citation_keywords | ≥ 200 |
| Citations seed-test-* | 100 |
| FULLTEXT ame→âme | > 0 |
| Œuvres dans citations générées | 7 lignes |

Si `Citations sans mots-clés > 0` → vérifier que les 6 vraies citations ont leurs liaisons keyword dans `seed_citations_test.sql` (elles y sont en théorie — cf. lignes 109-144 du fichier).

Si `FULLTEXT ame→âme = 0` → vérifier que la migration T11 (config FULLTEXT) a bien été appliquée ; T11 est un prérequis fonctionnel pour la recherche, pas pour ce seed.

- [ ] **Étape 4 : Relancer en idempotence (contrôle)**

```bash
ssh lumosphere "mysql mist2786_lumosphere < /home2/mist2786/lumosphere/db/seeds/seed_citations_generated.sql"
ssh lumosphere "mysql -e 'SELECT COUNT(*) FROM citations WHERE source_item_id LIKE \"seed-test-%\";' mist2786_lumosphere"
# Doit afficher 100 (pas 200)
```

---

## Auto-relecture spec vs plan

| Exigence spec | Tâche |
|---|---|
| ~100 citations générées | Task 1 (générateur, N=100) |
| 6 vraies citations conservées | Task 1 (seed_citations_test.sql modifié, pas supprimé) |
| 1 auteur Lulumineuse | Task 1 (INSERT auteur idempotent dans generated) |
| 7 œuvres canoniques | Task 1 (étapes 1 + 2 : renommage + 6 nouvelles) |
| Thèmes existants réutilisés | Task 1 (subselect `WHERE nom = '...'`) |
| 20 mots-clés, 2-4 par citation | Task 1 (KEYWORDS list + random.sample) |
| États 60/25/15 | Task 1 (ETATS_DIST shuffled) |
| Longueurs variées | Task 1 (LONGUEURS_DIST 30/50/20) |
| Idempotence | Task 1 (WHERE NOT EXISTS sur source_item_id + INSERT IGNORE) |
| Transaction tout-ou-rien | Task 1 (START TRANSACTION / COMMIT) |
| Reproductible (seed fixe) | Task 1 (random.seed(42)) |
| Script de vérification | Task 2 (008_verify_seed_corpus.sql) |
| Vérification FULLTEXT accent-insensible | Task 2 (AGAINST('ame') + LIKE '%âme%') |
| Contrôle idempotence | Task 2 (étape 4) |
