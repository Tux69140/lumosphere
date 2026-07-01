# Conception — Correspondance des styles de source vers Markdown (chaîne Telegram)

Date : 2026-07-01
Sujet : préservation des paragraphes + politique de conversion des styles non natifs du Markdown.

## Contexte / problème

Deux défauts observés dans l'atelier sur les posts Telegram collectés :

1. **Paragraphes fusionnés.** Les lignes vides séparant les paragraphes dans Telegram
   disparaissaient : l'atelier n'affichait plus que de simples retours à la ligne.
2. **Souligné en texte brut.** Les titres soulignés dans Telegram s'affichaient
   littéralement `<u>…</u>` dans l'éditeur.

### Causes racines identifiées

1. **`workers/process_telegram_v2.py`** (`clean_text`) : le motif `\s+\n` supprimait
   les espaces de fin de ligne, mais `\s` englobe `\n` → les `\n\n` (séparateurs de
   paragraphe) étaient réduits à `\n`. `format_as_markdown` découpant les paragraphes
   sur les lignes vides, tout se retrouvait fusionné en un seul bloc. **(corrigé, voir ci-dessous)**
2. **`cron/lib/telegram_pipeline.php`** : la table de correspondance des entités
   Telegram mappe `underline` vers du HTML brut `<u></u>`, inséré dans un flux censé
   être du Markdown pur. L'éditeur (Milkdown, preset CommonMark sans HTML inline)
   affiche donc la balise telle quelle. La table est de plus **dupliquée** (collecte
   en direct + import d'historique).

## Principe directeur

**Tout style de source non natif du Markdown est traduit vers l'équivalent Markdown
propre le plus proche — jamais de HTML dans le texte.**

Rationale : texte maître propre et portable, sûr pour la bibliothèque publique (pas
d'injection HTML), aller-retour éditeur fiable.

## Table de correspondance (référence actée)

| Style Telegram | Devient en Markdown | Statut |
|---|---|---|
| gras / italique / barré / code | inchangé (déjà natif : `**`, `_`, `~~`, `` ` ``) | en place |
| **souligné** | **gras + italique** `***…***` | **à coder** |
| texte masqué (spoiler) | *non géré* (futur) | différé |
| citation dépliable | *non géré* (futur) | différé |
| emoji personnalisé | *non géré* (futur) | différé |
| tout autre style inconnu | texte simple (style retiré) | comportement par défaut existant |

### Note sur le souligné

Le souligné Telegram a un sens **variable** selon les messages (tantôt un titre de
section, tantôt une simple emphase). Aucune conversion automatique ne peut trancher :
seul un humain sait. Le choix `***…***` (gras + italique) :
- reste du Markdown 100 % natif ;
- forme une **signature visuelle distincte** du gras seul et de l'italique seul
  (qui correspondent déjà à de vrais styles Telegram) → repérable comme « c'était souligné » ;
- laisse l'éditeur **promouvoir la ligne en vrai titre** pendant la révision quand
  c'en est un (menu de type de bloc déjà présent), sans automatisme hasardeux.

### Styles différés (spoiler / citation dépliable / emoji perso)

Non implémentés pour l'instant : ces entités **n'arrivent pas** dans la collecte
actuelle. Ils tombent dans le cas « inconnu → texte simple ». On les branchera si le
besoin réel apparaît. Techniquement, spoiler et citation dépliable relèvent d'une
transformation « bloc » (préfixe `>` sur des lignes entières), différente de
l'insertion de marqueurs en ligne ; ce point sera traité à ce moment-là.

## Portée de l'implémentation

**À coder maintenant :**

1. **Paragraphes** — `workers/process_telegram_v2.py:26` : `\s+\n` → `[ \t]+\n`
   (retire les espaces de fin de ligne sans toucher aux lignes vides). **Fait**, avec
   2 tests de non-régression ajoutés dans `tests/workers/test_process_telegram_v2.py`
   (chaîne réelle `clean_text` → `format_as_markdown`).
2. **Souligné** — `cron/lib/telegram_pipeline.php` : dans la table de correspondance,
   `underline` : `['<u>', '</u>']` → `['***', '***']`.
3. **Centralisation** — la table de correspondance est aujourd'hui dupliquée
   (`tg_entities_to_markdown` ~L77-83 et `tg_flatten_export_text` ~L140-146). La
   remonter en une **constante/fonction unique** partagée par les deux chemins
   (collecte en direct + import d'historique Telegram Desktop), source unique de vérité.

**Hors périmètre :** spoiler, citation dépliable, emoji personnalisé (différés) ;
aucune migration des données déjà collectées (posts de test, supprimés avant la mise
en production).

## Fichiers concernés

- `workers/process_telegram_v2.py` — correctif paragraphes (fait).
- `tests/workers/test_process_telegram_v2.py` — tests de non-régression (fait).
- `cron/lib/telegram_pipeline.php` — souligné `***` + centralisation de la table.
- `docs/conventions_traitement-lumosphere.md` — ajout d'une section « Correspondance
  des styles de source → Markdown » (la table ci-dessus) comme référence durable.

## Vérification

- Python : `ruff check workers/` + `pytest tests/workers/` (paragraphes).
- PHP : `php -l cron/lib/telegram_pipeline.php` ; contrôle qu'un message soulignant
  produit `***…***` et non `<u>…</u>`, via un petit test sur un payload représentatif.
- Éditeur : vérifier que `***…***` fait bien un aller-retour propre dans Milkdown
  (affiché gras-italique, re-sérialisé sans perte).

## Déploiement

Chaîne back (Python + PHP) hébergée sous `/home2/mist2786/public_html/`. Déploiement
des fichiers modifiés par rsync **sans `--delete`** (worker Python + `telegram_pipeline.php`),
sur feu vert explicite du chef de projet.
