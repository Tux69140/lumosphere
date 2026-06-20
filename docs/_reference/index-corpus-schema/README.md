# Schémas Index — source de conception du corpus

Artefacts récupérés du dépôt `index-lulumineux` **avant son archivage** (devbook 1.12). Servent de **référence de conception** pour la zone **corpus** (Phase 3). Ce sont des schémas **SQLite** d'origine — à adapter en **MySQL/MariaDB** (cf. devbook Annexe C).

| Fichier | Rôle |
| --- | --- |
| `schema_T0.2_v4_sources_simple.dbml` | **Tables** cibles (version retenue : `import_runs` fusionné). |
| `schema_T0.2_v2.sql` | **Triggers + seeds** concrets (version canonique SQL). |
| `triggers-fts5.txt` | Triggers FTS5 SQLite → **remplacés** par `FULLTEXT` InnoDB (référence historique). |

> Non utilisés tels quels : adaptation SQLite→MySQL requise. La **charte graphique** (ex-`Charte_couleurs_UI.docx`) est déjà intégrée au cahier §28 ; la **maquette d'accueil** provient d'une démo AIStudio (cf. `points_a_valider-phase1.md`), pas de l'ancien `.excalidraw`.
