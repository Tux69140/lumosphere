# T14 — Droits rôle/œuvre (RBAC) : application correcte + administration — Design

> Source trame : `docs/1-trame_execution-lumosphere.md` — T14 « Droits rôle/œuvre appliqués dans la DAL (matrice RBAC) » (Tranche 2). Source devbook : Dev §III.1 (Rôles et droits + écran utilisateurs) + §I.3 complément (matrice RBAC) + §23 cahier (accès par œuvre). Prérequis T06, T10.

## 1. Contexte & point de départ

Le moteur de droits existe déjà en grande partie (DAL §I.4 marquée terminée), mais **la règle visiteur est incorrecte** et **l'administration manque**.

Déjà en place :
- Helpers DAL : `dal_require_permission(ctx, code)`, `dal_oeuvre_access_clause(...)`, `dal_soft_delete_clause(...)`.
- Permissions semées (`db/migrations/004_auth.sql`) : codes `corpus.read`, `corpus.read_all`, `admin.users`, `admin.roles`, etc. Associations rôle↔permission semées : Admin a tout ; Éditeur a `corpus.read_all` (voit tous les états) ; Visiteur/Abo3/Abo4 n'ont que `corpus.read`.
- Backend utilisateurs **complet** : `dal_find_users / dal_get_user / dal_create_user / dal_update_user / dal_delete_user` (bcrypt cost 12, min 8 caractères, ne renvoie jamais `password_hash`, rôle Administrateur protégé). Exposés via `api/endpoints/users.php` et `apiClient` (`findUsers/createUser/updateUser/deleteUser`).
- Backend rôles : `dal_find_roles`, `dal_get_role_with_permissions`, `dal_update_role_permissions` (permission `admin.roles`).

À corriger / construire :
- **A.** La règle d'accès par œuvre (visiteur voit aujourd'hui à tort les œuvres réservées ; abonnés non cumulatifs).
- **B.** L'écran admin « Utilisateurs » (l'`AdminPage` est un stub « À venir (T14) »).
- **C.** L'écran admin « Rôles et droits » + le backend pour lire/écrire `role_oeuvre_access` (inexistant).

## 2. Modèle de droits (règles confirmées)

- Une œuvre est **réservée** dès qu'elle est accordée à Abo3 et/ou Abo4 dans `role_oeuvre_access`. Sinon elle est **publique**.
- Accès **cumulatif et croissant** : Visiteur ⊂ Abo3 ⊂ Abo4 ⊂ Éditeur ⊂ Admin.

| Rôle | Œuvres visibles | États visibles |
|---|---|---|
| **Visiteur** | publiques (non réservées) | **Publiée** uniquement |
| **Abo3** | publiques **+** réservées à Abo3 | **Publiée** uniquement |
| **Abo4** | publiques **+** réservées à Abo3 **+** réservées à Abo4 | **Publiée** uniquement |
| **Éditeur** | toutes | tous les états |
| **Admin** | toutes | tous les états |

Critère « voit tous les états / toutes les œuvres » = possède la permission **`corpus.read_all`** (Éditeur + Admin). Le « palier » abonné (Abo3 vs Abo4) reste déterminé par le `role_id`.

## 3. Décisions (validées chef de projet)

| Sujet | Décision |
|---|---|
| Visiteur / Abo3 / Abo4 | État **Publiée uniquement** |
| Visiteur | Œuvres **publiques** uniquement (exclut les réservées) — **correction du défaut actuel** |
| Abonnés | **Cumulatifs** : Abo4 voit aussi les œuvres réservées à Abo3, et tous voient le public |
| Découpage | **Tout en une fois** : A (filtrage) + B (Utilisateurs) + C (Rôles et droits) |
| Nom écran C | **« Rôles et droits »** (cohérent avec devbook §III.1) |
| Menu admin | Dans la **sidebar gauche**, **à la place** des filtres quand on est en section admin |
| Édition des permissions techniques | **Hors périmètre** (semées, fixes) |
| Mot de passe oublié (email) | **Hors périmètre** (l'admin réinitialise depuis l'écran Utilisateurs) |

## 4. Partie A — Correction du filtrage (DAL)

### 4.1 `dal_oeuvre_access_clause` (réécriture)
Fichier : `api/dal/core.php`. La fonction renvoie un fragment SQL `AND ...` ajouté à chaque SELECT sur les citations, avec paramètres liés par référence.

Logique cible :
- **A la permission `corpus.read_all`** (Éditeur/Admin) → renvoie `''` (aucune restriction).
- **Sinon** → toujours `AND {etat_col} = ETAT_PUBLIEE`, plus une clause œuvre selon le rôle :
  - **Visiteur** : `AND {oeuvre_col} NOT IN (SELECT oeuvre_id FROM role_oeuvre_access)` (uniquement les œuvres publiques).
  - **Abo3** : `AND ({oeuvre_col} NOT IN (SELECT oeuvre_id FROM role_oeuvre_access) OR {oeuvre_col} IN (SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id = :ctx_abo3))`.
  - **Abo4** : `AND ({oeuvre_col} NOT IN (SELECT oeuvre_id FROM role_oeuvre_access) OR {oeuvre_col} IN (SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id IN (:ctx_abo3, :ctx_abo4)))`.

Le critère « read_all » se lit via `in_array('corpus.read_all', $ctx['permissions'], true)` plutôt que par test de `role_id` en dur (plus robuste). Les `role_id` (ROLE_ABO3, ROLE_ABO4) servent uniquement à choisir le palier. Tous les sous-`SELECT` sont des constantes internes — aucune entrée client concaténée ; les valeurs `:ctx_*` sont liées.

### 4.2 `dal_find_oeuvres` (réécriture du filtre)
Fichier : `api/dal/oeuvres.php`. La liste des œuvres (filtre latéral) doit refléter la **même visibilité** que les citations :
- `corpus.read_all` → toutes les œuvres.
- Visiteur → œuvres publiques.
- Abo3 → publiques + réservées Abo3.
- Abo4 → publiques + réservées Abo3/Abo4.

Même structure de clause que 4.1 (sur `o.id`). Pas de filtre d'état ici (une œuvre n'a pas d'état).

### 4.3 Audit d'application
Vérifier que `dal_oeuvre_access_clause` est bien appliqué sur **toutes** les lectures de citations : `dal_find_citations`, `dal_search_citations`, `dal_get_citation`, `dal_count_citations` (déjà le cas — vérifier après réécriture). Auteurs / thèmes / mots-clés restent des référentiels non filtrés par œuvre (métadonnées non sensibles).

### 4.4 Tests (PHPUnit, `tests/dal/`)
Étendre `RolesAccessTest.php` avec un petit jeu : 2 œuvres publiques, 1 réservée Abo3, 1 réservée Abo4, citations Publiée + À Corriger dans chacune. Vérifier :
- Visiteur : voit les Publiée des 2 publiques ; **ne voit pas** les réservées ni les non-Publiée.
- Abo3 : publiques + réservée-Abo3 (Publiée) ; pas la réservée-Abo4.
- Abo4 : publiques + réservée-Abo3 + réservée-Abo4 (Publiée).
- Éditeur : tout, tous états.
- `dal_find_oeuvres` renvoie la bonne liste d'œuvres par rôle.

## 5. Partie B — Écran admin « Utilisateurs »

Frontend uniquement (backend complet). Accès **Admin** (`admin.users`).

- **Tableau** (`UsersTable`) : colonnes prénom, nom, email, rôle, actions (éditer / supprimer). Données via `apiClient.findUsers()` + `findRoles()` (pour afficher le libellé du rôle).
- **Bouton « + Ajouter un utilisateur »** → modale `UserFormModal` (Radix Dialog) : prénom, nom, email, rôle (select Radix depuis `findRoles`), mot de passe + confirmation. Validation Zod côté client (email valide, mot de passe ≥ 8, confirmation identique). À l'édition, mot de passe laissé vide = inchangé.
- À l'enregistrement : `createUser` / `updateUser` ; **champs mot de passe vidés** après succès ; toast `sonner` ; rafraîchissement de la liste.
- **Suppression** : confirmation (Radix AlertDialog) → `deleteUser`. Le rôle Administrateur est protégé côté backend (un dernier admin ne peut pas perdre son rôle / être supprimé) ; afficher l'erreur renvoyée le cas échéant.

## 6. Partie C — Écran admin « Rôles et droits »

Accès **Admin** (`admin.roles`).

### 6.1 Backend nouveau (`role_oeuvre_access`)
Fichier : `api/dal/roles.php` (+ route dans `api/endpoints/roles.php`).
- `dal_get_role_oeuvre_access(pdo, ctx, role_id): array` — requiert `admin.roles` ; renvoie la liste des `oeuvre_id` accordés au rôle (`SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id = :role_id`).
- `dal_set_role_oeuvre_access(pdo, ctx, role_id, oeuvre_ids[]): array` — requiert `admin.roles` ; **n'accepte que** `role_id ∈ {ROLE_ABO3, ROLE_ABO4}` (sinon `dal_error`) ; remplace l'ensemble dans une **transaction** (`DELETE` puis `INSERT` des ids, castés `int`, paramètres liés).
- Routes : `GET /api/roles/{id}/oeuvres` → liste ; `PUT /api/roles/{id}/oeuvres` (body `{ oeuvre_ids: [...] }`) → remplace. CSRF requis sur le PUT.
- `apiClient` : `getRoleOeuvres(roleId)`, `setRoleOeuvres(roleId, oeuvreIds)`.

### 6.2 Écran (`RolesAccess`)
- Liste des rôles (`findRoles`). Pour **Abo3** et **Abo4** : panneau avec la **liste complète des œuvres** (`findOeuvres` — l'admin voit tout) en cases à cocher ; cochée = réservée à ce rôle. Liste à hauteur plafonnée + défilement (réutiliser le motif T13). Bouton « Enregistrer » → `setRoleOeuvres`.
- Visiteur / Éditeur / Admin : affichés en lecture seule avec une note (« voit tout le contenu public » / « voit tout »). Pas de cases.
- Indiquer clairement : « les œuvres non cochées restent publiques (visibles des visiteurs) ».

## 7. Sidebar contextuelle

La `Sidebar` (dans `MainLayout`) devient **dépendante du contexte de route** :
- Sur les routes **non-admin** (bibliothèque) → affiche la recherche + filtres (comportement T13, inchangé).
- Sur les routes **`/admin/*`** → affiche le **menu admin** (`AdminNav`) : liens « Utilisateurs » et « Rôles et droits », **à la place** des filtres.

Détection via `useLocation()` (`pathname.startsWith('/admin')`). La sidebar reste une sidebar (cf. [[project_sidebar-filtres]]) ; seul son contenu change. Le `CorpusSearchProvider` n'est pas sollicité côté admin (pas de recherche).

## 8. Navigation & accès admin

- Routes : `/admin` → redirige vers `/admin/utilisateurs`. Sous-routes `/admin/utilisateurs` (B) et `/admin/roles` (C).
- **Garde de rôle** : seul l'Admin (`role_id === ROLE_ADMIN`) accède à `/admin/*`. Nouveau composant `RequireAdmin` (ou extension de `RequireAuth`) → redirige un non-admin vers l'accueil. Le lien « Administration » du `Header` n'apparaît que pour l'Admin.
- Défense en profondeur : la garde frontend est cosmétique ; la vraie protection reste les permissions `admin.users` / `admin.roles` vérifiées dans la DAL.

## 9. Découpage des unités (fichiers)

Backend :
- `api/dal/core.php` (modif) — `dal_oeuvre_access_clause` réécrite.
- `api/dal/oeuvres.php` (modif) — `dal_find_oeuvres` réécrite.
- `api/dal/roles.php` (modif) — `dal_get_role_oeuvre_access`, `dal_set_role_oeuvre_access`.
- `api/endpoints/roles.php` (modif) — routes `{id}/oeuvres` GET/PUT.
- `tests/dal/RolesAccessTest.php` (modif) — matrice complète.

Frontend :
- `src/services/api.ts` (modif) — `getRoleOeuvres`, `setRoleOeuvres`.
- `src/components/Sidebar.tsx` (modif) — bascule contenu filtres / `AdminNav`.
- `src/components/AdminNav.tsx` (create) — menu admin.
- `src/components/RequireAdmin.tsx` (create) — garde de rôle.
- `src/features/admin/AdminPage.tsx` (modif) — devient la coquille avec sous-routes (ou supprimée au profit des deux pages).
- `src/features/admin/UsersPage.tsx` + `UsersTable.tsx` + `UserFormModal.tsx` (create).
- `src/features/admin/RolesAccessPage.tsx` (create).
- `src/App.tsx` (modif) — sous-routes admin + `RequireAdmin`.

## 10. Tests

- **PHPUnit** : matrice d'accès (§4.4) ; `dal_get/set_role_oeuvre_access` (lecture, remplacement, refus si rôle ≠ Abo3/Abo4, refus sans `admin.roles`).
- **Vitest** : `UserFormModal` (validation Zod : email, mot de passe ≥ 8, confirmation) ; `Sidebar` bascule filtres↔AdminNav selon la route ; `RolesAccessPage` coche/décoche et appelle `setRoleOeuvres` ; `RequireAdmin` redirige un non-admin.
- **Manuel** : créer un Abo3, lui réserver 1 œuvre, se connecter en Abo3 → ne voit que public + cette œuvre, en Publiée. Visiteur (déconnecté) → ne voit pas l'œuvre réservée.
- Quality gate : `php -l`, `pnpm lint`, `pnpm build`, `pnpm test`.

## 11. Hors périmètre T14

- Édition des permissions techniques par rôle (codes `corpus.*`, `atelier.*`…) : semées et fixes, pas d'écran.
- Création/suppression de **rôles** (les 5 rôles sont fixes ; Admin protégé). Seule l'affectation d'œuvres aux abonnés est éditable.
- « Mot de passe oublié » / changement de mot de passe par l'utilisateur lui-même (flux email) → tâche ultérieure.
- Référentiels CRUD (auteurs/œuvres/thèmes/mots-clés) → T16.
