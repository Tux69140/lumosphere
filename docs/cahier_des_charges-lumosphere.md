# CAHIER DES CHARGES — Lumosphère

**Version 1.0 — 20 juin 2026 — Application unique : atelier + bibliothèque, full-web / PWA**

Ce cahier fusionne et remplace :

- `index-lulumineux/docs/cahier_des_charges-index_lulumineux.md` (v5.1) — la bibliothèque éditoriale ;
- `pretraitement/docs/document_specification-pretraitement.md` + `README.md` (Epuriel) — l'atelier de préparation.

Il prend le cahier Lumosphère comme socle produit et **réintègre les fonctions d'atelier d'Epuriel**, jusqu'ici déléguées à un « pipeline annexe séparé ». Atelier et bibliothèque deviennent **deux zones d'une même application**.

---

## 1. Décisions d'architecture retenues (socle, verrouillées)

1. **Une seule application web** sur o2switch, couvrant l'atelier de préparation **et** la bibliothèque éditoriale, **installable en PWA** (Windows/Linux/Mac/Android).
2. **Stack** : React + Vite (interface) + API PHP + **base MySQL/MariaDB unique** = source de vérité. Plan SvelteKit/Node/SQLite de l'ancien Index abandonné ; ses spécifications fonctionnelles et son schéma de données restent la référence.
3. **Phase full-web en ligne** : accès internet requis, **pas de mode hors-ligne** ni de cache du corpus dans cette phase.
4. **Portabilité par PWA** : un seul code couvre toutes les plateformes ; emballage Microsoft Store + Google Play via PWABuilder. **Pas d'Electron.** La **couche d'abstraction UI/UX + services est conservée** pour permettre un emballage natif (Tauri) ultérieur sans réécrire l'interface.
5. **Plus de format pivot fichier ni de zone de transit** : à la fin de la révision, la **validation du lot par l'éditeur** intègre **directement** l'entrée au corpus si elle est conforme aux règles (écriture en transaction tout-ou-rien). La mise en **Publiée** reste un acte humain distinct.
6. **Lots jetables** : un lot est un espace de travail temporaire, effacé après import en base (sauf mode débogage). Seuls les repères de collecte par source sont conservés.
7. **Sécurité** : authentification serveur (sessions PHP, cookie `httpOnly`/`Secure` + CSRF). Aucun secret côté navigateur.
8. **Nom** : application = **Lumosphère** ; « Epuriel » = nom interne de l'atelier.

---

## 2. Rôle du document

Décrit **ce que l'application doit faire**, en langage lisible par un non-programmeur mais assez précis pour guider le développement. Complété par : `docs/4-stack_technique-lumosphere.md` (technique), `docs/_contexte-ia/` (pack condensé pour l'IA codeuse), et le devbook de migration (`docs/4-devbook_migration_full_web-lumosphere.md`).

---

## 3. Objectif général

Lumosphère centralise, prépare, édite, organise, recherche et exporte des citations et textes spirituels. Deux responsabilités, une même application :

- **L'atelier** (ex-Epuriel) transforme des sources hétérogènes — PDF, Telegram, YouTube, HTML, texte collé — en documents segmentés, nettoyés, révisés et enrichis, prêts à intégrer la bibliothèque.
- **La bibliothèque** est le système de vérité éditoriale : contenus validés, auteurs, œuvres, thèmes, mots-clés, états, droits ; consultation, recherche et futur RAG.

Entre les deux, une **règle de validation** : l'atelier prépare et révise ; à la fin de la révision, **l'éditeur valide le lot** ; s'il est conforme aux règles, l'entrée **s'intègre automatiquement au corpus** (pas de seconde relecture). La mise en **Publiée**, en revanche, reste un acte humain distinct (voir §11).

---

## 4. Principes d'expérience utilisateur

- Chercher sans comprendre la structure technique ; filtres toujours visibles et faciles à modifier ; résultats rapides ; textes longs lisibles ; écrans d'administration et d'atelier sobres.
- **Utilisable sur desktop, tablette et mobile** (interface responsive — la PWA s'installe sur mobile).
- Vie privée respectée : pas de pistage publicitaire, pas d'analytics tiers, pas de cookie inutile.

---

## 5. Profils et droits

| Profil             | Bibliothèque                                                                                                                           | Atelier                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Visiteur**       | Consultation publique, recherche, favoris locaux navigateur.                                                                           | Aucun accès.                                                             |
| **Abo3**           | Consultation des œuvres autorisées au rôle Abo3.                                                                                       | Aucun accès.                                                             |
| **Abo4**           | Consultation des œuvres autorisées au rôle Abo4.                                                                                       | Aucun accès.                                                             |
| **Éditeur**        | Crée, corrige, révise les entrées ; gère mots-clés, thème, auteur, œuvre, état ; aide IA. **Valide les lots révisés (intégration auto au corpus) et décide du passage à Publiée.** | Prend en charge des lots, révise, enrichit, enregistre en bibliothèque.  |
| **Administrateur** | Accès complet : utilisateurs, rôles, accès Abo3/Abo4 par œuvre, auteurs/œuvres/thèmes/états/emojis, LiteLLM, sauvegardes, supervision. | Configure sources et collecteurs, supervise lots, nettoyage et journaux. |

**Mot de passe initial** : si un administrateur par défaut existe au premier démarrage, son changement est imposé avant toute administration.

---

## 6. Architecture fonctionnelle d'ensemble

```text
        SOURCES                 ATELIER (zone tables atelier)            VALIDATION             BIBLIOTHÈQUE (zone tables corpus)
 PDF / Telegram / YouTube  →  lot jetable → traitement → révision     →  validation du lot    →  entrées intégrées, recherche, consultation
 HTML / texte collé             (journal léger, repères de collecte)    (éditeur) → auto         (auteurs, œuvres, thèmes, droits)
                                                   \__________________ une seule base MySQL ___________________/
```

- **Une base MySQL**, deux zones de tables : *atelier* (lots, journaux, jobs, sources, registre IA) et *corpus* (entrées, auteurs, œuvres, thèmes, mots-clés, rôles, médias). **Pas de zone de transit** entre les deux.
- **Règle** : l'atelier n'écrit dans le corpus qu'au moment de la **validation du lot**, après contrôle de conformité, en une **transaction** (tout ou rien). Aucune écriture partielle ou non contrôlée ; après écriture réussie, le lot est supprimé.

---

## 7. Atelier — sources et collecte

### 7.1 Sources

- **PDF** : upload manuel, ou récupération automatique.
- **Telegram** : messages du bot `@Actualis_bot` (« Extracteur pour la Lumosphère »), regroupés en lot hebdomadaire ou manuel.
- **YouTube** : transcriptions de playlists déclarées.
- **HTML** : URL déclarées.
- **Texte collé** : saisie directe.

### 7.2 Collecte automatique

Collecteurs lancés par cron créant des **lots en attente** : Telegram (messages du bot agrégés par période), YouTube (nouvelles vidéos), HTML (URL déclarées). PDF = à l'initiative de l'utilisateur. Flux : source déclarée → collecteur → création du lot → dépôt du brut → inscription en base → statut `en_attente`.

---

## 8. Atelier — lots jetables, traitement, journal

### 8.1 Lot = espace de travail temporaire

**Un lot = un responsable à la fois.** Un lot est traité par étapes selon sa source (extraction, nettoyage, segmentation, OCR si disponible, enrichissement IA, révision). **Après import réussi en base, le dossier du lot est entièrement effacé** (source brute et étapes intermédiaires comprises).

- **Mode débogage** (**désactivé par défaut**) : conserve l'intégralité du dossier du lot pour le diagnostic pendant le dev.
- **Repères conservés en base**, par source auto-collectée (Telegram, YouTube, HTML — pas le PDF manuel) : date du **dernier** document collecté (reprise sans re-télécharger) et date du **plus ancien** (rattrapage historique).

### 8.2 Traitements

Selon la source : extraction texte/images (outils à définir), nettoyage, structuration, segmentation, déduplication. **OCR (outils à définir) absent d'o2switch** → chaîne PDF OCR contrainte, à valider/reporter. Tout traitement long passe de préférence par la **file de jobs `server_jobs` + cron**.

### 8.3 Journal

Suivi **léger** en base (créé / pris / validé / supprimé, erreurs) ; pas de trace granulaire par étape ; élagage des anciennes entrées. Pas de fichier de journal par lot.

---

## 9. Validation du lot → intégration au corpus (remplace l'import pivot et le staging)

### 9.1 Contrôle de conformité

À la validation d'un lot révisé, l'application vérifie : complétude du **jeu complet** (thème, date, auteur, mots-clés), normalisation, et absence de doublon (hash de contenu + `telegram_message_id`). Toute non-conformité **bloque l'intégration** et est signalée à l'éditeur pour correction.

### 9.2 Intégration automatique

Si le lot est conforme, l'application crée **directement** dans le corpus l'entrée, sa source, ses mots-clés et leurs associations, en une **transaction** : application des règles métier (état par défaut **À Corriger**, normalisation), intégration des seuls segments retenus. Après **vérification de l'écriture**, le dossier du lot est **supprimé**.

> **L'intégration n'est pas la publication.** L'entrée arrive en **À Corriger** ; son passage à **Publiée** exige une **validation humaine** ultérieure — notamment des **mots-clés proposés par l'IA** — après révision (voir §11).

---

## 10. Structure d'une entrée (corpus)

| Champ               | Description                                              |
| ------------------- | -------------------------------------------------------- |
| Contenu Markdown    | Texte principal, source éditoriale.                      |
| Notes               | Notes associées.                                         |
| Œuvre               | Œuvre ou support d'origine.                              |
| Auteur              | Déduit de l'œuvre.                                       |
| Date                | De publication.                                          |
| Thème               | Thème/sous-thème, **obligatoire pour l'intégration au corpus**. |
| Mots-clés           | Indexation fine, normalisés.                             |
| État                | À Réviser, À Corriger, Publiée, ou autre état configuré. |
| Telegram message id | Identifiant éventuel pour dédoublonnage.                 |

Contenu stocké en **Markdown enrichi**. Le HTML n'est pas la donnée maître : généré pour l'affichage, régénérable depuis le Markdown.

---

## 11. États de publication

| État       | Code | Rôle                         |
| ---------- | ---- | ---------------------------- |
| À Corriger | C    | Défaut à la création/import. |
| À Réviser  | R    | Corrigée, non validée.       |
| Publiée    | P    | Visible selon les droits.    |

États système non supprimables. **Pas de passage à Publiée sans thème, date de publication, auteur et mots-clés renseignés, ET sans validation humaine** (en particulier des mots-clés proposés par l'IA) après révision.

---

## 12. Organisation du contenu

- **Auteurs** : nom, site, informations libres.
- **Œuvres** : nom, abréviation, auteur, URL, référence libraire, description, niveau d'accès par rôle (Abo3/Abo4).
- **Thèmes** : hiérarchie sur **deux niveaux maximum** ; nom, parent optionnel, description.
- **Mots-clés** : normalisés, unicité insensible à la casse ; la saisie propose les existants.

---

## 13. Interface publique (bibliothèque)

- **Bandeau supérieur collant** : gauche logo + titre `Lumosphère` ; droite Favoris, Bibliothèque, Contact, Aide (contextuelle : contenu **spécifique à la page/section en cours**), thème clair/sombre, Configuration (rôles autorisés), Connexion/déconnexion.
- **Panneau de filtres** : œuvres, auteurs, thèmes/sous-thèmes, mots-clés (recherche + filtre alphabétique, bascule OU/ET), dates, recherche plein texte, réinitialisation. Visible sur grand écran, repliable sur mobile.
- **Zone de résultats** : nombre d'entrées, messages, critères actifs en badges supprimables, cartes d'entrées, `Fin des résultats.`
- **Carte d'entrée** : thème/sous-thème, œuvre, contenu rendu depuis Markdown, notes, mots-clés cliquables, favori, édition rapide (éditeur/admin).
- **Pied de page** : logos **Biovibralyon.fr** et **Lulumineuse.com** avec hyperliens, texte d'attribution. Non collant (visible en fin de défilement).

---

## 14. Recherche

Combine plein texte, auteur, œuvre, thème, mots-clés, dates, état (admin), droits par rôle.

- Plein texte via **MySQL FULLTEXT**, **insensible à la casse et aux accents** (collation accent-insensible).
- Performant sur **50 000 entrées** : virtualisation > 200 éléments, pagination par curseur, index, debounce 300 ms.
- Futur RAG / recherche sémantique = couche séparée, indépendante du moteur.

---

## 15. Référentiel partagé (lecture interne)

L'atelier lit **directement en base** le référentiel (thèmes, sous-thèmes, mots-clés validés, auteurs, types documentaires, règles de normalisation) pour proposer des suggestions cohérentes. La bibliothèque en reste propriétaire.

---

## 16. Éditeur Markdown riche

Éditeur visuel type Typora ; contenu stocké en Markdown ; bascule source possible. Barre d'outils dès le début : gras, italique, titres H1–H4, listes, bloc de citation, liens, images (médiathèque), tableaux, notes, emojis, annuler/rétablir, reset. Tableaux éditables sans écrire de Markdown. Images : texte alternatif, légende, informations, chemin stable.

---

## 17. Administration des entrées

Tableau avec sélection multiple, aperçu, auteur, œuvre, thème, état, édition/suppression, recherche admin, filtres mémorisés. Actions groupées : modifier ; supprimer (double confirmation) ; changer œuvre/état/thème/mots-clés (Ajouter/Remplacer/Supprimer). Suppression douce (`deleted_at`).

---

## 18. Médiathèque (phase 2)

Miniatures ; import JPG/PNG/GIF/WebP/SVG ; limite de poids configurable (2 Mo par défaut) ; texte alternatif ; informations ; édition ; suppression confirmée.

## 19. Bibliothèque de documents (phase 2)

Ajout PDF/EPUB ; titre, description, type, date ; visibilité selon rôle ; édition ; suppression confirmée ; consultation/téléchargement côté visiteur autorisé.

## 20. Notifications visiteurs (phase 2)

Formulaire de contact avec **sélection de catégorie** en termes simples :
- « Question sur le contenu » → routé vers un éditeur (+ copie admin).
- « Autre » → routé vers l'administrateur.

Champs : catégorie, email, message. Anti-spam honeypot + CSRF. Le visiteur reçoit un **accusé de réception par email** après envoi.

Tableau admin : statut (Nouveau / En cours / Traité), catégorie, email, aperçu, date, destinataire routé ; notes internes ; suppression confirmée.

---

## 20bis. Notifications internes par email (phase 2)

Le système envoie des emails aux utilisateurs internes (éditeur, admin) lors d'événements applicatifs :

| Événement | Destinataire(s) | Délai |
|-----------|-----------------|-------|
| **Message de contact** (formulaire §20) | Admin ou éditeur (selon catégorie) | Immédiat |
| **Erreur de traitement** (job échoué) | Admin + éditeur assigné au lot (si applicable) | Immédiat |
| **Lot(s) prêt(s) à valider** | Éditeur assigné | **Fréquence paramétrable** (en nombre de jours : 1 = quotidien, 7 = hebdo, 14 = bimensuel ; 0 = désactivé). Chaque éditeur règle sa fréquence dans ses préférences. Un digest récapitulatif est envoyé par cron. |

**Transport** : PHPMailer via SMTP authentifié o2switch. Config SMTP dans `config/config.php` (côté serveur uniquement, jamais versionné). Templates email simples en HTML inline.

---

## 21. Import Telegram par bot

Bot `@Actualis_bot` (« Extracteur pour la Lumosphère »). Champs jamais réaffichés après sauvegarde : jeton du bot (chiffré), nom d'utilisateur, nom fonctionnel. Chaque canal autorisé est relié à une œuvre (auteur déduit). Import : canal + dates → récupération → fenêtre de révision (sélectionner, grouper, prévisualiser) → **validation → intégration au corpus** (si conforme). Entrées en état `À Corriger`. Doublons évités par `telegram_message_id` et marqueur de collecte. Sobriété : un lot par période, un document par lot, pas de trace par post.

---

## 22. IA avec LiteLLM

Fonctions : proposer mots-clés, thème/sous-thème, aider l'éditeur sans modifier sans validation. Administration : providers configurables (openai/anthropic/mistral/deepseek/gemini/ollama_cloud), modèle par défaut, **allowlist** des modèles visibles, prompts modifiables, test de connexion, journalisation coût/latence. Registre des modèles conservé (atelier). L'utilisateur final ne voit jamais les clés.

---

## 23. Rôles et accès aux œuvres

L'administrateur crée/modifie des rôles, sauf Administrateur (protégé). Abo3/Abo4 existent dès l'initialisation. L'administrateur définit, par rôle, les œuvres visibles. **Règle forte : toutes les requêtes de lecture appliquent les droits** (pas un masquage visuel).

---

## 24. Authentification et sécurité

- **Login + session serveur**, cookie `httpOnly` ; en production `Secure`, HTTPS, expiration, CSRF sur actions sensibles.
- **Aucun secret côté navigateur** (jetons, clés IA, identifiants Telegram restent serveur).
- Requêtes SQL en paramètres liés ; secrets hors dépôt ; validation avant écriture.

---

## 25. Sauvegardes

Sauvegarde de la **base MySQL** (dump) et des fichiers (médias, bibliothèque) ; restauration contrôlée ; remise à zéro complète avec double confirmation.

---

## 26. Exports (phase 3)

Principe : **ce qui est affiché est ce qui est exporté** (filtres, recherche, droits, ordre). PDF via Typst ; EPUB via Pandoc (binaire à embarquer — absent d'o2switch). Page d'introduction configurable avec variables `{{works}}`, `{{themes}}`, `{{keywords}}`, `{{searchTerm}}`, `{{count}}`, `{{date}}`.

---

## 27. Accès multi-plateforme (PWA)

L'application est une **PWA installable** : un seul code couvre Windows, Linux, Mac et Android.

- Installation directe depuis le navigateur (« Installer » / « Ajouter à l'écran d'accueil ») et emballage **Microsoft Store + Google Play** via PWABuilder. (App Store Apple non couvert ; Mac accessible hors-store.)
- **En ligne** dans cette phase : pas de consultation hors-ligne ni de base locale.
- Interface **responsive** (desktop/tablette/mobile).
- La **couche d'abstraction** est conservée pour permettre, si besoin, un emballage natif (Tauri) ultérieur sans réécrire l'interface.
- *(Hors périmètre)* : outil mobile d'**édition** pour 2-3 éditeurs = développement tiers séparé, parlant à la même API.

---

## 28. Charte graphique

Charte **validée par l'autrice**. Jeu de pictogrammes : **Phosphor Icons**.

[Mode clair]  
Fond de page principal: #f8fefc  
Fond des cartes et panneaux: #ffffff  
Fond de la barre de menu supérieure: #ffffff  
Texte du menu supérieur: #38444D  
Texte secondaire du menu supérieur: #64748b  
Liens du menu supérieur: #1e293b  
Icônes du menu supérieur: #1e293b  
Fond des boutons du menu supérieur: #fff4f4  
Bordures du menu supérieur: #e2e8f0  
Fond de sous-zone légère: #f8fafc  
Fond des champs: #ffffff  
Bordures et cadres: #e2e8f0  
Texte principal: #3D3A35  
Texte secondaire: #706B63  
Texte discret / placeholder: #64748b  
Action principale: #2b4f35  
Action principale au survol: #4338ca  
Texte sur action principale: #ffffff  
Accent éditorial: #D3B67B  
Fond d'accent léger: #ffffdf  
Texte sur accent léger: #9a3412  
Fond des tags / puces: #ececff  
Texte des tags / puces: #4338ca  
Fond des badges succès: #dcfce7  
Texte des badges succès: #166534  
Couleur d'avertissement: #d97706  
Fond des badges avertissement: #fef3c7  
Texte des badges avertissement: #92400e  
Couleur d'erreur / danger: #dc2626  
Fond des badges danger: #fee2e2  
Texte des badges danger: #991b1b  

[Mode sombre]  
Fond de page principal: #0f172a  
Fond des cartes et panneaux: #1e293b  
Fond de la barre de menu supérieure: #1e293b  
Texte du menu supérieur: #f8fafc  
Texte secondaire du menu supérieur: #cbd5e1  
Liens du menu supérieur: #e2e8f0  
Icônes du menu supérieur: #f8fafc  
Fond des boutons du menu supérieur: #334155  
Bordures du menu supérieur: #475569  
Fond de sous-zone légère: #334155  
Fond des champs: #0f172a  
Bordures et cadres: #475569  
Texte principal: #e2e8f0  
Texte secondaire: #cbd5e1  
Texte discret / placeholder: #94a3b8  
Action principale: #818cf8  
Action principale au survol: #6366f1  
Texte sur action principale: #0f172a  
Accent éditorial: #fb923c  
Fond d'accent léger: #000040  
Texte sur accent léger: #fdba74  
Fond des tags / puces: #312e81  
Texte des tags / puces: #c7d2fe  
Fond des badges succès: #1f4d35  
Texte des badges succès: #86efac  
Couleur d'avertissement: #f59e0b  
Fond des badges avertissement: #4b3514  
Texte des badges avertissement: #fcd34d  
Couleur d'erreur / danger: #f87171  
Fond des badges danger: #4f1d1d  
Texte des badges danger: #fecaca

## 29. Accessibilité

Navigation clavier ; contrastes suffisants ; textes alternatifs ; formulaires avec labels ; modales accessibles ; aucune information donnée uniquement par la couleur.

---

## 30. Phases fonctionnelles

### Phase 1 — Cœur web : atelier + bibliothèque

Application web unique + PWA, base MySQL, **authentification et rôles**, accès par œuvre ; atelier (lots jetables, sources PDF/Telegram, étapes, journal léger, révision, enrichissement IA) ; validation du lot → intégration automatique au corpus ; bibliothèque (consultation, recherche/filtres, gestion auteurs/œuvres/thèmes/mots-clés/états) ; éditeur Markdown riche ; IA LiteLLM ; favoris web et source Telegram.

### Phase 2 — Modules complémentaires

Sources YouTube et HTML ; médiathèque, bibliothèque de documents, notifications ; import Telegram manuel ; sauvegardes/restauration ; emballage magasins (PWABuilder).

### Phase 3 — Exports

PDF Typst, EPUB Pandoc, configuration d'export.

---

## 31. Hors périmètre initial

Mode hors-ligne / cache du corpus ; édition hors-ligne avec synchronisation ; outil mobile d'édition pour 2-3 éditeurs (séparé, futur) ; application native Tauri/Android en magasin (porte ouverte, non retenue maintenant) ; App Store Apple ; recherche sémantique / RAG ; exports avant la phase 3 ; migration des anciennes données de test ; import Telegram automatique.
