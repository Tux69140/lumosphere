#!/usr/bin/env python3
"""
Génère db/seeds/seed_citations_generated.sql
Usage : python3 db/seeds/generate_citations.py [--n N]
  --n N   Nombre de citations à générer (défaut : 10000)

Exemples :
  python generate_citations.py              # génère 10000 citations
  python generate_citations.py --n 100      # génère 100 citations (dev rapide)

Distribution des longueurs :
  - 200 "très long"  (~8 pages, 12 000–16 000 chars)
  - 20 % "long"      (~3 paragraphes, 400–900 chars)
  - 50 % "moyen"     (~2 phrases, 100–250 chars)
  - reste "court"    (~1 phrase, 40–100 chars)
"""
import argparse
import os
import random
from collections import Counter

parser = argparse.ArgumentParser(description='Génère un fichier SQL de seed de citations.')
parser.add_argument('--n', type=int, default=10000,
                    help='Nombre de citations à générer (défaut : 10000)')
args = parser.parse_args()

SEED = 42
N = args.n
random.seed(SEED)

# ── Lexique étendu ────────────────────────────────────────────────────────────
SUJETS = [
    "L'âme", "La lumière", "La prière", "Le silence", "La présence divine",
    "Le cœur", "La grâce", "L'amour", "La sagesse", "La foi",
    "Le souffle de Dieu", "La conscience", "La paix intérieure", "L'esprit",
    "Chaque être", "Le chemin intérieur", "La douceur de Dieu",
    "La miséricorde", "La vérité intérieure", "Le regard de Dieu",
    "La bienveillance", "L'éveil spirituel", "La joie profonde",
    "L'humilité du cœur", "La force tranquille", "Le don de soi",
    "La clarté intérieure", "La réconciliation", "L'espérance vivante",
    "La tendresse divine", "La confiance", "Le renoncement",
]
VERBES = [
    "illumine", "transforme", "guérit", "apaise", "élève",
    "ouvre", "purifie", "libère", "nourrit", "rayonne vers",
    "habite", "traverse", "accompagne", "révèle", "embrasse",
    "invite à découvrir", "appelle vers", "touche en profondeur",
    "enveloppe", "soutient", "fortifie", "consolide", "éveille",
    "oriente", "ressemble à", "prépare le terrain pour",
    "dissout les résistances de", "s'épanouit dans", "chemine avec",
    "renouvelle", "sanctifie", "pacifie",
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
    "l'élan de vie qui nous porte",
    "la source de toute guérison",
    "les chaînes invisibles du passé",
    "le tissu de nos relations",
    "la mémoire de l'âme",
    "l'héritage de nos ancêtres spirituels",
    "les frontières de l'ego",
    "la lumière qui sommeille en chacun",
    "le fil conducteur de l'existence",
    "l'espace de la réconciliation intérieure",
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
    "et invite à un service désintéressé.",
    "lorsque la paix devient notre fondement.",
    "à mesure que la confiance s'approfondit.",
    "dans cet espace sacré qu'est le cœur.",
    "et ouvre une voie nouvelle vers la guérison.",
    "quand l'ego consent à s'effacer.",
    "et porte en lui les graines de la transformation.",
    "si nous choisissons de nous laisser conduire.",
    "en nous invitant à contempler l'essentiel.",
    "et illumine les ténèbres les plus profondes.",
]

TRANSITIONS = [
    "C'est pourquoi", "Ainsi,", "De cette façon,", "En ce sens,",
    "Il convient donc de noter que", "On comprend alors que",
    "Cette réalité nous enseigne que", "À cela s'ajoute le fait que",
    "Pour aller plus loin,", "Sur cette voie,",
    "Dans cette perspective,", "Il est également remarquable que",
    "Au fil du temps,", "En approfondissant cette intuition,",
]

def phrase_simple():
    return (
        f"{random.choice(SUJETS)} {random.choice(VERBES)} "
        f"{random.choice(COMPLEMENTS)} {random.choice(FINALES)}"
    )

def paragraphe(nb_phrases):
    phrases = [phrase_simple() for _ in range(nb_phrases)]
    # Ajouter une transition au début des paragraphes suivants
    if random.random() < 0.4:
        phrases[0] = random.choice(TRANSITIONS) + " " + phrases[0][0].lower() + phrases[0][1:]
    return " ".join(phrases)

def make_texte(longueur):
    if longueur == "court":
        return phrase_simple()
    elif longueur == "moyen":
        return " ".join(phrase_simple() for _ in range(random.randint(2, 3)))
    elif longueur == "long":
        paras = [
            paragraphe(random.randint(2, 4))
            for _ in range(random.randint(2, 3))
        ]
        return "\\n\\n".join(paras)
    else:  # tres_long : ~8 pages, 15-20 paragraphes de 8-12 phrases
        paras = [
            paragraphe(random.randint(8, 12))
            for _ in range(random.randint(15, 20))
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
    "Chemin et relation à Dieu",
    "Connaissance et vision du monde",
    "Relations humaines et vie concrète",
    "Vie intérieure et transformation personnelle",
]

# ── Distribution longueurs ────────────────────────────────────────────────────
# 200 "très long" fixes (quel que soit N, min 2 si N < 200)
NB_TRES_LONG = min(max(2, 200), N)
reste = N - NB_TRES_LONG
_n_long  = max(1, round(reste * 0.20))
_n_moyen = max(1, round(reste * 0.50))
_n_court = reste - _n_long - _n_moyen
if _n_court < 1:
    _n_court = 1
    _n_moyen = reste - _n_long - _n_court

LONGUEURS_DIST = (
    ["tres_long"] * NB_TRES_LONG
    + ["long"]     * _n_long
    + ["moyen"]    * _n_moyen
    + ["court"]    * _n_court
)
random.shuffle(LONGUEURS_DIST)

# ── Distribution états : ~60 % Publiée / ~25 % À Corriger / ~15 % À Réviser ─
_n_publiee   = max(1, round(N * 0.60))
_n_corriger  = max(1, round(N * 0.25))
_n_reviser   = N - _n_publiee - _n_corriger
if _n_reviser < 1:
    _n_reviser = 1
    _n_publiee = N - _n_corriger - _n_reviser
ETATS_DIST = ["Publiée"] * _n_publiee + ["À Corriger"] * _n_corriger + ["À Réviser"] * _n_reviser
random.shuffle(ETATS_DIST)
ETAT_VARS = {
    "Publiée":    "@etat_publiee",
    "À Corriger": "@etat_corriger",
    "À Réviser":  "@etat_reviser",
}

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
out.append("-- ┌──────────────────────────────────────────────────────────────────────────────┐")
out.append(f"-- │ GÉNÉRÉ par db/seeds/generate_citations.py (SEED=42, N={N})                 │")
out.append(
    f"-- │ Distribution : {NB_TRES_LONG} très longs | {_n_long} longs | "
    f"{_n_moyen} moyens | {_n_court} courts │"
)
out.append("-- │ NE PAS MODIFIER — régénérer :                                               │")
out.append("-- │   python3 db/seeds/generate_citations.py --n <N>                            │")
out.append("-- └──────────────────────────────────────────────────────────────────────────────┘")
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
    out.append("INSERT INTO oeuvres (auteur_id, nom, abreviation)")
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
out.append(f"-- 5. Citations générées (idempotentes via source_item_id) — N={N}")
for i in range(N):
    idx = i + 1
    sid = f"seed-test-{idx:05d}"
    contenu = esc(make_texte(LONGUEURS_DIST[i]))
    oeuvre_nom = random.choice(OEUVRE_NOMS)
    oeuvre_var = OEUVRE_VARS[oeuvre_nom]
    theme = random.choice(THEMES_ALL)
    etat = ETATS_DIST[i]
    etat_var = ETAT_VARS[etat]
    date = f"2026-{random.randint(1, 6):02d}-{random.randint(1, 28):02d}"
    kws = random.sample(KEYWORDS, random.randint(2, 4))

    out.append(f"-- [{idx:05d}] {sid} ({LONGUEURS_DIST[i]})")
    out.append(
        "INSERT INTO citations (contenu, oeuvre_id, theme_id, "
        "etat_id, auteur_nom, source_item_id, date_entree)"
    )
    out.append(f"SELECT '{contenu}',")
    out.append(f"  {oeuvre_var},")
    out.append(f"  (SELECT id FROM themes WHERE nom = '{esc(theme)}'),")
    out.append(f"  {etat_var},")
    out.append("  'Lulumineuse',")
    out.append(f"  '{sid}',")
    out.append(f"  '{date}'")
    out.append(
        f"WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = '{sid}' "
        "AND deleted_at IS NULL);"
    )
    out.append(
        f"SET @cit = (SELECT id FROM citations WHERE source_item_id = '{sid}' "
        "AND deleted_at IS NULL);"
    )
    out.append("")
    for kw in kws:
        out.append("INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)")
        out.append(f"  SELECT @cit, id FROM keywords WHERE mot = '{esc(kw)}' AND @cit IS NOT NULL;")
    out.append("")

out.append("COMMIT;")

# Écriture dans le fichier SQL
_script_dir = os.path.dirname(os.path.abspath(__file__))
_output_path = os.path.join(_script_dir, "seed_citations_generated.sql")
with open(_output_path, "w", encoding="utf-8") as _f:
    _f.write("\n".join(out) + "\n")

# Rapport
dist = Counter(LONGUEURS_DIST)
print(f"Fichier généré : {_output_path}")
print(f"Total         : {N} citations")
print(f"  très long   : {dist['tres_long']} (~12 000–16 000 chars, ≈8 pages PDF)")
print(f"  long        : {dist['long']}  (~400–900 chars)")
print(f"  moyen       : {dist['moyen']}  (~100–250 chars)")
print(f"  court       : {dist['court']}  (~40–100 chars)")
