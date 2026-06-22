# Trame de travail — Lumosphère

**Version 1.0 — fusionne** `pretraitement/docs/trame_travail-pretraitement.md` (méthode atelier Epuriel) et `index-lulumineux/docs/trame_travail-index_lulumineux.md` (méthode bibliothèque).

## 1. Rôle du document

Décrit **comment on travaille** (méthode, règles d'exécution, qualité), pas **quoi** faire ni dans quel ordre. Le **quoi/quand** vit dans les deux devbooks :
- `4-devbook_migration_full_web-lumosphere.md` — rendre l'atelier Epuriel full-web + poser le socle base/auth/serveur ;
- `3-devbook_developpement-lumosphere.md` — **construire la bibliothèque / UI documentaire complète et toutes les chaînes de préparation** (prend le relais).

**Séquençage inter-devbooks** : `1-trame_execution-lumosphere.md` — liste ordonnée de toutes les tâches (T01–T47), chacune pointant vers la section du devbook concerné. C'est le **point d'entrée unique** pour savoir quelle tâche faire ensuite.

Source d'autorité pour coder : `docs/_contexte-ia/`.

## 2. Principes de travail

- Migration en cours : **rien n'est acquis sans validation explicite** du chef de projet.
- Les anciennes applications servent de **référence fonctionnelle** uniquement ; ne pas migrer les anciennes données de test (base initiale **vide**).
- Toujours construire sur le **schéma cible MySQL** (plus de SQLite ; SQLite seulement comme éventuel export futur).
- **Valider avant écriture** : validation côté React (Zod) **et** revalidation côté PHP.
- **Jamais d'accès base depuis le navigateur** : tout passe par l'API PHP (PDO paramètres liés).
- **Ce qui peut être fait côté serveur l'est côté serveur** ; l'interface pilote, révise, valide.
- **Pas d'hébergeur nommé dans le code** ; secrets hors dépôt.
- **Documents synchronisés à chaque décision importante** (cahier, stack, `_contexte-ia`, devbook).

## 3. Méthode d'exécution d'une tâche

1. **Lire** le pack `_contexte-ia/` (autorité) + l'item concerné du devbook.
2. **Proposer** l'approche au chef de projet et obtenir sa **validation** (surtout choix structurants).
3. **Coder** par petits incréments, vocabulaire métier visible.
4. **Tester au fil de l'eau** (cf. §4).
5. **Vérifier** (`lint` + `build` verts + contrôle manuel ciblé) avant de cocher l'item.

## 4. Règle transversale sur les tests

Les tests s'écrivent **en même temps** que le code, pas après :
- règle métier / transformation de données → test unitaire ;
- parcours utilisateur important → test e2e (Playwright) ;
- endpoint API → test API sur lot de démonstration ;
- script PHP → `php -l`, puis PHPStan / PHPCS ;
- worker Python → test sur petit fichier + Ruff ;
- avant livraison sensible → contrôle Gitleaks (secrets, dont auth).

Un développement n'est **pas stabilisé** si les tests manquent **sans justification** (et la vérification manuelle de remplacement notée).

## 5. Règles de développement

- Ne pas viser la perfection graphique d'emblée ; ne pas bâtir l'administration complète avant le premier flux Telegram.
- L'interface manipule des **lots de n'importe quelle source** (pas enfermée dans Telegram) ; **réutiliser** les composants pour PDF / YouTube / HTML.
- **Vocabulaire métier** : lot, source, brut, étape, révision, enrichissement, **validation, intégration, publication**, journal. (Plus de « pivot » ni « staging ».)
- **Couche d'abstraction obligatoire** : l'UI n'importe jamais le runtime (Electron retiré ; Tauri possible plus tard) ; passer par les services applicatifs.
- Traitements longs **découplés de l'API HTTP** : l'API crée des lignes `server_jobs`, le cron les traite.

## 6. Qualité — « terminé » veut dire

`lint` + `build` verts · tests requis présents (ou absence justifiée) · contrôle manuel du parcours · secrets non exposés (Gitleaks) · documents mis à jour · **validé par le chef de projet**.

## 7. Suivi & documentation

Le **devbook** est l'outil de pilotage : une case `- [x]` n'est cochée qu'**après validation**. Toute décision structurante est répercutée dans le cahier / stack / `_contexte-ia` (un seul endroit fait autorité par sujet).

## 8. Feuille de route (renvoi)

Séquencement détaillé : **les deux devbooks** (migration + développement). Récapitulatif des phases (cahier §30) :

| Phase | Périmètre | Livrable principal |
| --- | --- | --- |
| 1 | Cœur web : atelier + bibliothèque | App + PWA, base MySQL, auth/rôles, atelier (lots, PDF/Telegram), **intégration directe au corpus**, bibliothèque (recherche/filtres), éditeur Markdown, IA LiteLLM. |
| 2 | Modules | YouTube/HTML, médiathèque, bibliothèque de documents, notifications, Telegram manuel, sauvegardes, emballage magasins. |
| 3 | Exports | PDF Typst, EPUB Pandoc, configuration d'export. |
| 4+ | Évolutions | Synchronisation/local, mobile, automatisations (hors périmètre actuel). |

## 9. Critères de validation globaux

Projet sain si : les documents ne se contredisent plus · l'app web fonctionne avant tout packaging · les **droits par œuvre** s'appliquent **côté serveur** · l'éditeur produit un **Markdown propre** · les recherches restent rapides sur **50 000 entrées** · **aucun secret en dur** · l'**intégration au corpus** respecte les règles (conformité, transaction, intégration ≠ publication) · les exports reflètent exactement les résultats affichés.
