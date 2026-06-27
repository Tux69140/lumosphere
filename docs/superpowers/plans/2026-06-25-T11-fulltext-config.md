# T11 — Configuration FULLTEXT MariaDB — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurer MariaDB pour indexer les mots courts français (≥ 2 caractères) et désactiver les stopwords anglais, puis reconstruire l'index FULLTEXT des citations.

**Architecture:** Deux variables globales MariaDB modifiées via SSH (`SET GLOBAL`), suivi d'un `OPTIMIZE TABLE` pour ré-indexer les 106 citations existantes. Un fichier de documentation commité dans le projet pour référence future.

**Tech Stack:** MariaDB 11.4 · SSH o2switch · SQL

## Global Constraints

- Utilisateur MySQL : `mist2786_lumo_usr` sur base `mist2786_lumosphere`
- SSH alias serveur : `lumosphere`
- Chemin seeds/verify serveur : `/home2/mist2786/public_html/db/`
- Pas de modification de schéma ni de code applicatif — configuration serveur uniquement.
- Commit seulement sur demande explicite du chef de projet.

---

## Prérequis manuel (chef de projet, AVANT d'exécuter cette tâche)

**Action cPanel requise :** accorder « tous les privilèges » à l'utilisateur `mist2786_lumo_usr` sur la base `mist2786_lumosphere` via cPanel → MySQL Databases → « Manage User Privileges ».

Sans cette étape, la commande `SET GLOBAL` sera refusée par le serveur.

---

## Structure des fichiers

| Fichier | Action | Rôle |
|---|---|---|
| `db/config/mariadb_fulltext_config.sql` | **CREATE** | Documentation des commandes de configuration (référence redéploiement) |

---

## Task 1 : Appliquer la configuration FULLTEXT + vérifier

**Files:**
- Create: `db/config/mariadb_fulltext_config.sql`

**Interfaces:**
- Consumes: base `mist2786_lumosphere` avec 106 citations et index FULLTEXT existant (T10)
- Produces: `innodb_ft_min_token_size = 2`, `innodb_ft_enable_stopword = OFF`, index FULLTEXT reconstruit → débloque T13 (recherche)

- [ ] **Étape 1 : Vérifier que les pleins droits sont accordés**

```bash
ssh lumosphere "mysql mist2786_lumosphere -e \"SHOW GRANTS FOR CURRENT_USER();\"" 2>/dev/null | grep -v Deprecated
```

Attendu : une ligne contenant `GRANT ALL PRIVILEGES` ou au moins `SUPER`. Si la réponse ne contient pas ces droits, s'arrêter et demander au chef de projet d'effectuer le prérequis cPanel.

- [ ] **Étape 2 : Créer `db/config/mariadb_fulltext_config.sql`**

```sql
-- db/config/mariadb_fulltext_config.sql
-- Configuration FULLTEXT MariaDB pour Lumosphère (T11).
-- À exécuter une fois sur le serveur avec un utilisateur disposant des pleins droits.
-- Ré-exécuter + OPTIMIZE TABLE citations après tout redéploiement sur un nouveau serveur.

SET GLOBAL innodb_ft_min_token_size = 2;    -- mots courts : IA, âme, OM…
SET GLOBAL innodb_ft_enable_stopword = OFF; -- aucun mot filtré silencieusement

OPTIMIZE TABLE citations; -- reconstruit l'index FULLTEXT avec les nouveaux réglages
```

- [ ] **Étape 3 : Copier le fichier sur le serveur et l'appliquer**

```bash
scp db/config/mariadb_fulltext_config.sql lumosphere:/home2/mist2786/public_html/db/config/mariadb_fulltext_config.sql
```

Si le dossier n'existe pas :
```bash
ssh lumosphere "mkdir -p /home2/mist2786/public_html/db/config"
scp db/config/mariadb_fulltext_config.sql lumosphere:/home2/mist2786/public_html/db/config/mariadb_fulltext_config.sql
```

Puis appliquer :
```bash
ssh lumosphere "mysql mist2786_lumosphere < /home2/mist2786/public_html/db/config/mariadb_fulltext_config.sql" 2>/dev/null | grep -v Deprecated
```

Attendu : pas d'erreur (MySQL silencieux sur succès).

- [ ] **Étape 4 : Vérifier les variables**

```bash
ssh lumosphere "mysql mist2786_lumosphere -e \"SHOW VARIABLES LIKE 'innodb_ft_min_token_size'; SHOW VARIABLES LIKE 'innodb_ft_enable_stopword';\"" 2>/dev/null | grep -v Deprecated
```

Attendu :
```
Variable_name                Value
innodb_ft_min_token_size     2
innodb_ft_enable_stopword    OFF
```

- [ ] **Étape 5 : Vérifier la recherche FULLTEXT**

```bash
ssh lumosphere "mysql mist2786_lumosphere -e \"
SELECT 'mots 2 lettres (IA)' AS test,
       COUNT(*) AS nb_resultats
FROM citations
WHERE MATCH(contenu, notes, auteur_nom) AGAINST('IA' IN BOOLEAN MODE)
  AND deleted_at IS NULL;

SELECT 'accent-insensible (ame→âme)' AS test,
       COUNT(*) AS nb_resultats
FROM citations
WHERE MATCH(contenu, notes, auteur_nom) AGAINST('ame' IN BOOLEAN MODE)
  AND contenu LIKE '%âme%'
  AND deleted_at IS NULL;
\"" 2>/dev/null | grep -v Deprecated
```

Attendus :
- `mots 2 lettres (IA)` : > 0 (les citations générées contiennent « IA » dans leurs textes)
- `accent-insensible (ame→âme)` : > 0 (déjà validé en T10, doit rester vrai)

Si `mots 2 lettres (IA) = 0` : vérifier que `innodb_ft_min_token_size = 2` est bien appliqué et que `OPTIMIZE TABLE` a été exécuté.

---

## Auto-relecture spec vs plan

| Exigence spec | Tâche |
|---|---|
| `innodb_ft_min_token_size = 2` | Task 1 étapes 3 + 4 |
| `innodb_ft_enable_stopword = OFF` | Task 1 étapes 3 + 4 |
| `OPTIMIZE TABLE citations` | Task 1 étape 3 (inclus dans le fichier SQL) |
| Vérification variables + recherche | Task 1 étapes 4 + 5 |
| Fichier `db/config/mariadb_fulltext_config.sql` | Task 1 étape 2 |
| Prérequis pleins droits utilisateur | Prérequis manuel + étape 1 |
