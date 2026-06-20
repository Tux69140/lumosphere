# Points à valider — Phase 1

> **Statut** : les documents listés sont **produits en brouillon, NON validés**. Ce fichier liste ce qui mérite votre relecture et votre décision, document par document. Rien n'est figé tant que vous ne l'avez pas confirmé.

## 0. Documents à relire

| Document                           | Objet                                               |
| ---------------------------------- | --------------------------------------------------- |
| `cahier_des_charges-lumosphere.md` | Exigences fonctionnelles (31 chapitres).            |
| `stack_technique-lumosphere.md`    | Décisions techniques.                               |
| `docs/_contexte-ia/` (6 fichiers)  | Pack condensé pour l'IA codeuse.                    |
| `CLAUDE.md`                        | Cadrage du dépôt.                                   |
| `docs/_reference/`                 | Instantané réel du serveur (schéma + arborescence). |

---

## 1. Cahier des charges — points où j'ai tranché (à confirmer)

- **Périmètre des 31 chapitres** : reflète-t-il votre intention ? (atelier + bibliothèque + PWA + intégration directe au corpus).
- **5 profils** (Visiteur, Abo3, Abo4, Éditeur, Administrateur) : l'atelier réservé Éditeur/Admin — OK ?
- **Validation du lot → intégration automatique au corpus** : c'est le cœur du modèle. Validez-vous ce flux ?
- **Médiathèque, bibliothèque, notifications, exports** classés en phases 2/3 : d'accord avec ce séquencement ?
- **Sobriété Telegram** (un lot/période, un document, pas de trace par post) : conservée — OK ?

> **✅ Validé (avec correction)** : pas de seconde relecture en zone de transit. La **validation humaine du lot en fin de révision intègre directement l'entrée au corpus** si elle est conforme. La **publication (« Publiée ») reste un acte humain distinct** (validation notamment des mots-clés proposés par l'IA). Tout le reste OK.

## 2. Stack technique — points techniques à arbitrer

- **Recherche accent-insensible** : à valider/tester (la collation actuelle `utf8mb4_unicode_ci` ignore-t-elle bien les accents ? « eveil » doit trouver « éveil »). Décision technique que je confirmerai par un test.
- **OCR absent d'o2switch** (Tesseract/OCRmyPDF/Poppler) → la **chaîne PDF est contrainte**. Votre arbitrage : tenter une installation, ou **reporter** le PDF scanné ?
- **EPUB (Pandoc absent)** : phase 3, nécessitera un binaire embarqué — à acter le moment venu.
- **Site à la racine** `public_html/` : confirmé ? (impacte le déploiement et l'URL).

> **✅ Tranché** : recherche **accent-insensible** retenue (à confirmer par test). **OCR** (Tesseract/OCRmyPDF/Poppler) et **Pandoc** : **à installer** (venv si pas d'autre voie), pas reportés. **Site à la racine** `public_html/` **confirmé** (c'est l'hébergement de Lumosphère).

## 3. Schéma de données — points à valider

- **Nettoyage `type_document` (D9)** : aujourd'hui la colonne mélange `telegram`, `Telegram` et des valeurs héritées. Valeur cible unique retenue = **`Telegram`** — confirmez-vous ?
- **`pivot_exports`** : abandonnée (plus de pivot ni de zone de transit) — OK ?
- **`sync_files` abandonnée** et **`import_runs` non créée** : confirmés.
- ~~**Tables de staging** (`import_staging_*`)~~ : **abandonnées** (voir ci-dessous).

> **✅ Tranché** : nettoyage `type_document` → **`Telegram`** confirmé. **Pas de zone de staging** : la validation humaine du lot l'**intègre directement au corpus** s'il respecte les règles (écriture en transaction, vérification, puis suppression du lot). `pivot_exports` **abandonnée** (plus de pivot ni de staging) ; `sync_files` abandonnée et `import_runs` non créée confirmés. Vocabulaire en **français** (fini « staging »).

## 4. Décisions ouvertes nécessitant votre choix

- **Récupérer la charte graphique** (`Charte_couleurs_UI.docx`) et la **maquette d'accueil** (`Lumosphere-accueil.excalidraw`) de l'ancien dépôt Index ? (fichiers binaires à importer).
- **Segment « epuriel » dans les chemins serveur** : le conserver (nom interne de l'atelier) ou tout migrer en « lumosphere » ?
- **Quand créer la structure de code** (`app/`, `api/`, `serveur/`) dans le nouveau dépôt et y importer le code Epuriel existant ? (début de Phase 2 ou plus tôt).

> **✅ Tranché** : la **charte graphique** est **intégrée au cahier** (§28), complétée par les pictogrammes **Phosphor Icons**. La **maquette d'accueil** sera récupérée d'une **appli de démo** (`/home/stef/Documents/Lulu/Archives/Telegram/AIStudio/`), **personnalisée selon la charte** et **revue pour le responsive et le plein écran**. Nom technique **« Epuriel » conservé**. Les structures de code seront créées **quand ce sera nécessaire**.

## 5. Pour information — décisions techniques que je prends (pas besoin de votre validation)

- Auth = sessions PHP (cookie httpOnly/Secure + CSRF). 
- Workers Python en venv py311, lancés par cron via `server_jobs`.
- Conventions de code, collation, types MySQL, adaptation SQLite→MySQL.
- Conception détaillée des tables (je vous soumettrai seulement les choix structurants).

> **Demande** : **auth forte** retenue → sessions `httpOnly`/`Secure` + CSRF + **limitation des tentatives** + **verrouillage** après échecs + **politique de mot de passe robuste** (bcrypt). Sans 2FA dans cette phase.

---

## Suite proposée

Vous relisez ces points + les documents, vous me faites part de vos validations/corrections, puis on ajuste avant de passer à la Phase 2 (base de données).
