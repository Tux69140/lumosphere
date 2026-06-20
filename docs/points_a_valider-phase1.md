# Points à valider — Phase 1

> **Statut** : les documents listés sont **produits en brouillon, NON validés**. Ce fichier liste ce qui mérite votre relecture et votre décision, document par document. Rien n'est figé tant que vous ne l'avez pas confirmé.

## 0. Documents à relire

| Document | Objet |
| --- | --- |
| `cahier_des_charges-lumosphere.md` | Exigences fonctionnelles (31 chapitres). |
| `stack_technique-lumosphere.md` | Décisions techniques. |
| `docs/_contexte-ia/` (6 fichiers) | Pack condensé pour l'IA codeuse. |
| `CLAUDE.md` | Cadrage du dépôt. |
| `docs/_reference/` | Instantané réel du serveur (schéma + arborescence). |

---

## 1. Cahier des charges — points où j'ai tranché (à confirmer)

- **Périmètre des 31 chapitres** : reflète-t-il votre intention ? (atelier + bibliothèque + PWA + staging).
- **5 profils** (Visiteur, Abo3, Abo4, Éditeur, Administrateur) : l'atelier réservé Éditeur/Admin — OK ?
- **Frontière staging → validation humaine → corpus** : c'est le cœur du modèle. Validez-vous ce flux ?
- **Médiathèque, bibliothèque, notifications, exports** classés en phases 2/3 : d'accord avec ce séquencement ?
- **Sobriété Telegram** (un lot/période, un document, pas de trace par post) : conservée — OK ?

## 2. Stack technique — points techniques à arbitrer

- **Recherche accent-insensible** : à valider/tester (la collation actuelle `utf8mb4_unicode_ci` ignore-t-elle bien les accents ? « eveil » doit trouver « éveil »). Décision technique que je confirmerai par un test.
- **OCR absent d'o2switch** (Tesseract/OCRmyPDF/Poppler) → la **chaîne PDF est contrainte**. Votre arbitrage : tenter une installation, ou **reporter** le PDF scanné ?
- **EPUB (Pandoc absent)** : phase 3, nécessitera un binaire embarqué — à acter le moment venu.
- **Site à la racine** `public_html/` : confirmé ? (impacte le déploiement et l'URL).

## 3. Schéma de données — points à valider

- **Nettoyage `type_document` (D9)** : aujourd'hui la colonne mélange `telegram`, `Telegram` et des valeurs héritées. Valeur cible unique retenue = **`Telegram`** — confirmez-vous ?
- **`pivot_exports` re-rôlée** en traçabilité staging (au lieu d'une table neuve) : OK, ou préférez-vous une table dédiée ?
- **`sync_files` abandonnée** et **`import_runs` non créée** : confirmés.
- **Tables de staging** (`import_staging_*`) : leur structure exacte vous sera **soumise pour validation** quand je la concevrai (Phase 3).

## 4. Décisions ouvertes nécessitant votre choix

- **Récupérer la charte graphique** (`Charte_couleurs_UI.docx`) et la **maquette d'accueil** (`Lumosphere-accueil.excalidraw`) de l'ancien dépôt Index ? (fichiers binaires à importer).
- **Segment « epuriel » dans les chemins serveur** : le conserver (nom interne de l'atelier) ou tout migrer en « lumosphere » ?
- **Quand créer la structure de code** (`app/`, `api/`, `serveur/`) dans le nouveau dépôt et y importer le code Epuriel existant ? (début de Phase 2 ou plus tôt).

## 5. Pour information — décisions techniques que je prends (pas besoin de votre validation)

- Auth = sessions PHP (cookie httpOnly/Secure + CSRF). 
- Workers Python en venv py311, lancés par cron via `server_jobs`.
- Conventions de code, collation, types MySQL, adaptation SQLite→MySQL.
- Conception détaillée des tables (je vous soumettrai seulement les choix structurants).

---

## Suite proposée

Vous relisez ces points + les documents, vous me faites part de vos validations/corrections, puis on ajuste avant de passer à la Phase 2 (base de données).
