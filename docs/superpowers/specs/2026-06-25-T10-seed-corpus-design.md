# T10 — Seed données de test corpus — Design

> Spec issue du brainstorming du 25/06/2026. Source devbook : Dev §I.3 + §I.7.
> Prérequis : T06 (schéma corpus en base). Débloque : T12 (affichage), T13 (recherche), T14 (droits).

## Objectif

Remplir la base `mist2786_lumosphere` avec **~100 citations de test** (+ les **6 vraies** déjà présentes) afin de disposer d'une bibliothèque réaliste à **afficher** et à **fouiller** dès la Phase II, avant les chaînes de traitement lourdes.

Le seed doit donner assez de matière et de variété pour tester réellement :
- l'affichage des cartes (T12) ;
- la recherche plein-texte **accent-insensible** + les filtres thème/œuvre/auteur (T13) ;
- le filtrage des droits par rôle/œuvre/état (T14).

## Données produites

| Élément | Détail |
|---|---|
| **Auteur** | 1 seul : `Lulumineuse` (site `https://lulumineuse.com`) |
| **Œuvres** | 7 : `Telegram`, `ebook`, `Directs`, `Guidance`, `Pratique`, `Atelier`, `Articles` |
| **Thèmes** | Réutilisation de l'arborescence **déjà seedée** en base (migration 006 : 4 parents + sous-thèmes). Aucune création de thème. |
| **Mots-clés** | Répertoire d'une vingtaine (Dieu, âme, prière, lumière, pardon, grâce, conscience, méditation, foi, présence, paix, cœur, silence, vérité, amour, esprit, sagesse, lâcher-prise, gratitude, service…). 2 à 4 par citation. |
| **Citations** | ~100 générées + 6 vraies conservées ≈ 106 |
| **États** | Mélange réaliste ≈ 60 % `Publiée`, 25 % `À Corriger`, 15 % `À Réviser` |

### Texte des citations

« Lorem ipsum spirituel français » : un générateur assemble des phrases à partir d'un **lexique de mots français accentués** du vocabulaire de Lulumineuse. Objectif double :
- **économie de tokens** (lexique + logique rédigés une fois, pas 100 textes à la main) ;
- **vrais mots français accentués** → la recherche accent-insensible (T13) est réellement testable.

Longueurs **variées** : phrases courtes (une ligne), paragraphes moyens, quelques textes longs (plusieurs paragraphes), pour éprouver le rendu des cartes et la lisibilité des textes longs.

## Livrables (2 fichiers)

1. **Générateur** : `db/seeds/generate_citations.py`
   - Python (cohérent avec les workers du projet ; aucune dépendance externe).
   - Lexique + logique d'assemblage de phrases.
   - Tirage **reproductible** (`random.seed` fixe) → sortie identique à chaque exécution.
   - Répartit automatiquement chaque citation sur œuvre / thème / état / mots-clés selon les proportions ci-dessus.
   - Écrit le bloc SQL des 100 citations générées.

2. **Seed SQL** : `db/seeds/seed_citations_test.sql` (existe déjà avec les 6 vraies citations)
   - **Étendu** avec les 100 citations générées (le bloc produit par le générateur).
   - Les 6 vraies citations Telegram sont **conservées** telles quelles.

## Contraintes techniques

- **Transaction** : tout le seed dans `START TRANSACTION` … `COMMIT` (tout-ou-rien).
- **Idempotence** : chaque citation générée porte un `source_item_id` stable (`seed-test-0001`, `seed-test-0002`, …) ; insertion via `INSERT … SELECT … WHERE NOT EXISTS (SELECT 1 FROM citations WHERE source_item_id = '…')`. Relancer le seed ne crée aucun doublon.
  - Rappel schéma : `telegram_message_id` est `UNIQUE` mais `NULL` pour les générées (plusieurs `NULL` autorisés en MySQL) → on s'appuie sur `source_item_id`, pas sur `telegram_message_id`.
- **Auteurs / œuvres / mots-clés** : insérés aussi en `WHERE NOT EXISTS` (sur `nom` / `mot`), comme le fait déjà le seed pour l'auteur et l'œuvre.
- **Associations mots-clés** : table `citation_keywords` (PK composite `citation_id, keyword_id`) ; insertions idempotentes via `INSERT IGNORE` ou `WHERE NOT EXISTS`.
- **Colonnes citations utilisées** : `contenu`, `oeuvre_id`, `theme_id`, `etat_id`, `auteur_nom`, `source_item_id`, `date_entree`. (`telegram_message_id` réservé aux vraies citations Telegram.)
- **Collation** : `utf8mb4_unicode_520_ci` (déjà en place) — c'est elle qui rend la recherche accent-insensible.

## Exécution

```bash
# 1. Régénérer le bloc SQL (en local)
python3 db/seeds/generate_citations.py

# 2. Pousser et exécuter sur le serveur
ssh lumosphere
mysql mist2786_lumosphere < db/seeds/seed_citations_test.sql
```

## Vérification

Script de comptage `db/verify/00X_verify_seed_corpus.sql` confirmant :
- ~106 citations au total ;
- 7 œuvres rattachées à l'auteur `Lulumineuse` ;
- les 3 états présents, dans des proportions cohérentes ;
- mots-clés bien associés (lignes dans `citation_keywords`) ;
- un `SELECT … MATCH(contenu) AGAINST('ame' IN BOOLEAN MODE)` retourne des résultats contenant « âme » (preuve accent-insensible).

## Hors périmètre (YAGNI)

- **Pas** de génération gros volume (1 000 / 10 000 / 50 000) ici — le générateur est paramétrable pour y monter plus tard si besoin (tests de perf, hors T10).
- **Pas** de configuration FULLTEXT (BOOLEAN MODE, token size, stopwords) : c'est T11.
- **Pas** d'attribution de droits rôle/œuvre : c'est T14 (le seed fournit juste les 7 œuvres distinctes nécessaires pour le tester).
