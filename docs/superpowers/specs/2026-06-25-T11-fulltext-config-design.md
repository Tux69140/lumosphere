# T11 — Configuration FULLTEXT MariaDB — Design

> Spec issue du brainstorming du 25/06/2026. Source devbook : Dev §III.4 complément.
> Prérequis : T10 (données de test en base). Débloque : T13 (recherche).

## Objectif

Configurer le moteur de recherche plein-texte de MariaDB pour qu'il indexe correctement le corpus de citations françaises : mots courts (« IA », « âme »), aucun mot filtré silencieusement, recherche accent-insensible.

## État actuel du serveur (vérifié le 25/06/2026)

| Variable | Valeur actuelle | Valeur cible |
|---|---|---|
| `innodb_ft_min_token_size` | 3 | **2** |
| `innodb_ft_enable_stopword` | ON | **OFF** |
| Collation colonnes FULLTEXT | `utf8mb4_unicode_520_ci` | ✅ déjà en place |
| Index FULLTEXT sur `citations` | présent | ✅ déjà en place |

## Décisions de design

**Mode de recherche :** `IN BOOLEAN MODE` — permet les opérateurs `+`, `-`, `*`, guillemets. Plus prévisible que `NATURAL LANGUAGE MODE` pour un usage éditorial.

**Stopwords :** désactivés (`OFF`) — dans un corpus de citations contemplatives, même « le », « de », « un » peuvent faire partie d'une expression significative (« le silence », « de l'âme »). Une liste française personnalisée n'apporterait pas de valeur suffisante.

**Taille minimale des mots :** 2 caractères — indispensable pour indexer « IA », « âme », « OM », etc.

**Tri par défaut :** `created_at DESC` (plus récent d'abord). Option score FULLTEXT (`MATCH … AGAINST` score) disponible pour la recherche T13.

## Exécution (étapes manuelles)

### Étape 1 — Accorder les pleins droits à l'utilisateur applicatif
Dans le **cPanel o2switch** → MySQL → accorder « tous les privilèges » à l'utilisateur `mist2786_lumo_usr` sur la base `mist2786_lumosphere`.

### Étape 2 — Appliquer la configuration via SSH
```bash
ssh lumosphere "mysql mist2786_lumosphere -e \"
  SET GLOBAL innodb_ft_min_token_size = 2;
  SET GLOBAL innodb_ft_enable_stopword = OFF;
  OPTIMIZE TABLE citations;
\""
```

`OPTIMIZE TABLE citations` reconstruit l'index FULLTEXT avec les nouveaux réglages — obligatoire pour que les 106 citations existantes soient ré-indexées.

### Étape 3 — Vérification
```bash
ssh lumosphere "mysql mist2786_lumosphere -e \"
  SHOW VARIABLES LIKE 'innodb_ft_min_token_size';
  SHOW VARIABLES LIKE 'innodb_ft_enable_stopword';
  SELECT COUNT(*) FROM citations
    WHERE MATCH(contenu, notes, auteur_nom) AGAINST('IA' IN BOOLEAN MODE);
  SELECT COUNT(*) FROM citations
    WHERE MATCH(contenu, notes, auteur_nom) AGAINST('ame' IN BOOLEAN MODE)
      AND contenu LIKE '%âme%';
\""
```

Résultats attendus :
- `innodb_ft_min_token_size` = 2
- `innodb_ft_enable_stopword` = OFF
- `AGAINST('IA')` > 0 (mots de 2 lettres maintenant indexés)
- `AGAINST('ame')` avec âme dans le contenu > 0

## Livrables

**1 seul fichier commité dans le projet :**
`db/config/mariadb_fulltext_config.sql` — documentation des commandes de configuration (référence pour tout futur redéploiement).

```sql
-- db/config/mariadb_fulltext_config.sql
-- Configuration FULLTEXT MariaDB pour Lumosphère (T11)
-- À exécuter une fois sur le serveur avec un utilisateur disposant des pleins droits.
-- Nécessite OPTIMIZE TABLE citations après exécution pour ré-indexer les données existantes.

SET GLOBAL innodb_ft_min_token_size = 2;    -- mots courts : IA, âme, OM…
SET GLOBAL innodb_ft_enable_stopword = OFF; -- aucun mot filtré silencieusement

OPTIMIZE TABLE citations; -- reconstruit l'index FULLTEXT avec les nouveaux réglages
```

## Hors périmètre (YAGNI)

- **Stemming français** : non disponible nativement sur MariaDB. Accepté en l'état — recherche par forme exacte. Alternative future via LiteLLM (hors T11).
- **Liste de stopwords française personnalisée** : non nécessaire, stopwords désactivés.
- **Modification du code applicatif** : aucune — cette tâche est purement serveur.
- **Pagination keyset / filtres combinés** : c'est T13 et T18.
