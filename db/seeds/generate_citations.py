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
    out.append(f"WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = '{sid}' AND deleted_at IS NULL);")
    # Récupération de l'ID réel (fonctionne que la ligne vienne d'être insérée ou existait déjà)
    out.append(f"SET @cit = (SELECT id FROM citations WHERE source_item_id = '{sid}' AND deleted_at IS NULL);")
    out.append("")
    for kw in kws:
        out.append(f"INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)")
        out.append(f"  SELECT @cit, id FROM keywords WHERE mot = '{esc(kw)}' AND @cit IS NOT NULL;")
    out.append("")

out.append("COMMIT;")
print("\n".join(out))
