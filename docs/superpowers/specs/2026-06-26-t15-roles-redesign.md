# T15 — Refonte « Rôles et droits » : gestion complète des rôles — Design

> Source trame : suite de T14. Tranche 2 — administration des droits.

## 1. Contexte & état actuel

L'écran « Rôles et droits » (`RolesAccessPage`) est aujourd'hui limité à deux panneaux de cases à cocher (Abonnés 3 / Abonnés 4) pour réserver des œuvres. Les 5 rôles sont fixes, leurs permissions figées en BDD, et aucun rôle ne peut être créé ni supprimé depuis l'interface.

**Ce que T15 ajoute :**
- Créer des rôles personnalisés avec un nom et des permissions choisies librement parmi les 16 disponibles.
- Modifier le nom et les permissions de **tous** les rôles existants (sauf Administrateur, protégé).
- Supprimer tout rôle sauf Administrateur (refusé si des utilisateurs y sont encore affectés).
- Refonte visuelle complète : master-detail en deux colonnes dans la zone de contenu principale.

## 2. Modèle de droits — extension

### 2.1 Visibilité des œuvres pour les rôles personnalisés

La clause `dal_oeuvre_visibility_clause` (actuelle) est simplifiée :

| Rôle | Œuvres visibles |
|---|---|
| `corpus.read_all` | Toutes (Éditeur, Admin) — pas de filtre |
| Abo4 (id=5) | Publiques **+** réservées Abo3 **+** réservées Abo4 *(cumul conservé)* |
| Tout autre rôle sans `read_all` | Publiques **+** réservées à ce rôle (`role_id = :ctx_role`) |

Visiteur (id=3) n'a aucune entrée dans `role_oeuvre_access` → voit uniquement le public. Son comportement « public uniquement » est conservé — aucune section « Œuvres réservées » ne lui est proposée dans l'interface.

### 2.2 Section « Œuvres réservées » — règles d'affichage

Affichée pour un rôle si ET SEULEMENT SI :
- le rôle a la permission `corpus.read` ET
- le rôle n'a PAS `corpus.read_all` ET
- `role_id !== ROLE_VISITEUR` (3)

Si `corpus.read_all` est coché → la section reste visible mais **grisée** avec la note :
> *« Ce rôle voit l'intégralité du corpus — les réservations d'œuvres ne s'appliquent pas. »*

## 3. Design visuel

### 3.1 Layout

Les deux colonnes occupent **toute la zone de contenu principale** (à droite de la sidebar AdminNav). Pas de sidebar secondaire.

```
┌─ Sidebar AdminNav ─┬──────────────────────── Zone principale ─────────────────────────┐
│ ○ Utilisateurs     │  ┌── Liste rôles (35%) ───┬── Fiche du rôle (65%) ──────────────┐ │
│ ● Rôles et droits  │  │  Rôles           [+]   │                                      │ │
│                    │  │ ─────────────────────  │  [Nom du rôle                    ]   │ │
│                    │  │ 🔒 Administrateur ◀ or │  (champ vide pour nouveau rôle)      │ │
│                    │  │ ● Éditeur              │                                      │ │
│                    │  │ ○ Visiteur             │  ── CORPUS ──────────────────────    │ │
│                    │  │ ○ Abonnés 3            │  ☑ Lire   ☑ Voir tout               │ │
│                    │  │ ○ Abonnés 4            │  ☐ Créer/modifier  ☐ Supprimer       │ │
│                    │  │ ○ Mon rôle       [🗑]  │                                      │ │
│                    │  │                        │  ── RÉFÉRENTIELS ────────────────    │ │
│                    │  │                        │  ☐ Œuvres & auteurs                  │ │
│                    │  │                        │  ☐ Thèmes  ☐ Mots-clés               │ │
│                    │  │                        │                                      │ │
│                    │  │                        │  ── ATELIER ─────────────────────    │ │
│                    │  │                        │  ☐ Accès ☐ Lots ☐ Valider ☐ Sources  │ │
│                    │  │                        │                                      │ │
│                    │  │                        │  ── ADMINISTRATION ───────────────   │ │
│                    │  │                        │  ☐ Utilisateurs  ☐ Rôles             │ │
│                    │  │                        │  ☐ Configuration  ☐ Sessions         │ │
│                    │  │                        │                                      │ │
│                    │  │                        │  ┄┄ Œuvres réservées ┄┄┄┄┄┄┄┄┄┄┄   │ │
│                    │  │                        │  ☑ Œuvre A  ☐ Œuvre B …              │ │
│                    │  │                        │                                      │ │
│                    │  │                        │  [Enregistrer]  [Supprimer ce rôle]  │ │
│                    │  └────────────────────────┴──────────────────────────────────────┘ │
└────────────────────┴───────────────────────────────────────────────────────────────────┘
```

### 3.2 Tokens visuels (dans la palette existante)

| Élément | Valeur |
|---|---|
| Rôle sélectionné | fond `--color-accent-bg` (#ffffdf), texte `--color-text-primary` |
| Admin (protégé) | bordure gauche 3px `--color-accent` (#d3b67b) + icône 🔒 |
| En-têtes de groupe | `text-xs font-semibold uppercase tracking-widest text-(--color-text-placeholder)` + règle `--color-border` |
| Section œuvres réservées | même style, règle en tirets (`border-dashed`) |
| Section grisée (`read_all`) | `opacity-40 pointer-events-none` + note explicative |
| Cases à cocher actives | `--color-action` (#2b4f35 vert forêt) |
| Bouton Enregistrer | `--color-accent` (#d3b67b) sur fond blanc |
| Bouton Supprimer | `--color-danger-text` texte seul, pas de fond coloré |

**Signature visuelle** : les en-têtes de groupe de permissions en petites capitales avec `tracking-widest` — traitement éditorial qui rappelle les séparateurs de chapitres d'un ouvrage de référence, ancré dans l'identité littéraire de Lumosphère.

### 3.3 États de la fiche

| Situation | Fiche droite |
|---|---|
| Aucun rôle sélectionné | Message centré : « Sélectionnez un rôle ou créez-en un nouveau » |
| Nouveau rôle (bouton +) | Champ Nom vide (focus automatique) + permissions toutes décochées sauf `corpus.read` |
| Rôle existant sélectionné | Nom pré-rempli (éditable sauf Admin) + cases selon permissions actuelles |
| Administrateur sélectionné | Tout en lecture seule (inputs `disabled`), pas de bouton Supprimer |

### 3.4 Interactions

- Sélectionner un rôle dans la liste → charge sa fiche via `getRoleWithPermissions(id)`.
- Cliquer « + » → fiche vierge, aucun rôle sélectionné dans la liste.
- **Enregistrer** (nouveau rôle) → `createRole` → rôle ajouté en liste, sélectionné automatiquement.
- **Enregistrer** (rôle existant) → `updateRole` (nom) + `updateRolePermissions` (permissions) + `setRoleOeuvres` (si section visible).
- **Supprimer** → `window.confirm` → `deleteRole` → si erreur API (utilisateurs affectés), toast rouge avec le message backend ; sinon toast vert + sélection du rôle précédent dans la liste.
- Basculer `corpus.read_all` → la section Œuvres réservées se grise ou se réactive immédiatement (état local, avant enregistrement).

## 4. Les 16 permissions — groupes et libellés UI

### Corpus
| Code | Libellé affiché |
|---|---|
| `corpus.read` | Lire les publications |
| `corpus.read_all` | Voir tout le corpus (brouillons inclus) |
| `corpus.write` | Créer et modifier des citations |
| `corpus.delete` | Supprimer des citations |

### Référentiels
| Code | Libellé affiché |
|---|---|
| `oeuvres.manage` | Gérer les œuvres et auteurs |
| `themes.manage` | Gérer les thèmes |
| `keywords.manage` | Gérer les mots-clés |

### Export
| Code | Libellé affiché |
|---|---|
| `export.request` | Exporter (PDF / EPUB) |

### Atelier
| Code | Libellé affiché |
|---|---|
| `atelier.access` | Accéder à l'atelier |
| `atelier.lots` | Traiter des lots |
| `atelier.validate` | Valider et intégrer au corpus |
| `atelier.sources` | Configurer les sources |

### Administration
| Code | Libellé affiché |
|---|---|
| `admin.users` | Gérer les utilisateurs |
| `admin.roles` | Gérer les rôles et droits |
| `admin.settings` | Gérer la configuration |
| `admin.sessions` | Voir les connexions / déconnecter |

Les libellés sont **hardcodés côté frontend** (aucun endpoint `/api/permissions` — YAGNI, les permissions sont fixes).

## 5. Architecture frontend

### Fichiers

| Fichier | Rôle |
|---|---|
| `src/features/admin/RolesAccessPage.tsx` (réécriture) | Page principale, état global, chargement |
| `src/features/admin/RoleList.tsx` (create) | Colonne gauche — liste + bouton + |
| `src/features/admin/RoleDetail.tsx` (create) | Colonne droite — fiche complète |
| `src/features/admin/permissionGroups.ts` (create) | Données statiques : groupes + libellés |
| `src/features/admin/__tests__/RolesAccessPage.test.tsx` (modif) | Tests mis à jour |

### État dans `RolesAccessPage`

```ts
const [roles, setRoles] = useState<Role[]>([])               // liste complète
const [oeuvres, setOeuvres] = useState<Oeuvre[]>([])         // pour section réservations
const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
const [detail, setDetail] = useState<RoleDetail | null>(null) // chargé on-demand
const [detailLoading, setDetailLoading] = useState(false)
```

### `RoleDetail` type

```ts
type RoleDetail = {
  id: number
  nom: string
  permission_ids: number[]
  oeuvre_ids: number[]       // depuis getRoleOeuvres (vide pour Admin/Éditeur)
  is_protected: boolean      // true si id === ROLE_ADMIN
  show_oeuvres: boolean      // true si corpus.read sans corpus.read_all et non Visiteur
}
```

### Méthodes `apiClient` à ajouter dans `src/services/api.ts`

```ts
getRoleWithPermissions: (id: number) => get<{ id: number; nom: string; permission_ids: number[] }>(`roles/${id}`)
createRole: (nom: string, permissionIds: number[]) =>
  post<{ id: number; nom: string }>('roles', { nom, permission_ids: permissionIds })
updateRole: (id: number, nom: string) =>
  put<{ id: number; nom: string }>(`roles/${id}`, { nom })
updateRolePermissions: (id: number, permissionIds: number[]) =>
  put<void>(`roles/${id}/permissions`, { permission_ids: permissionIds })
deleteRole: (id: number) => del<void>(`roles/${id}`)
```

*(Vérifier quelles méthodes existent déjà dans `api.ts` avant d'ajouter les doublons.)*

## 6. Architecture backend

### 6.1 Nouvelles fonctions DAL (`api/dal/roles.php`)

**`dal_create_role(PDO, ctx, string $nom, array $permission_ids): array`**
- Requiert `admin.roles`.
- Valide : `$nom` non vide, `permission_ids` entiers positifs.
- Transaction : `INSERT INTO roles (nom)` → récupère l'id → `INSERT INTO role_permissions` pour chaque id.
- Retourne `dal_ok(['id' => $id, 'nom' => $nom])`.

**`dal_update_role(PDO, ctx, int $id, string $nom): array`**
- Requiert `admin.roles`.
- Refuse si `$id === ROLE_ADMIN` (protégé).
- `UPDATE roles SET nom = :nom WHERE id = :id`.
- Retourne `dal_ok(['id' => $id, 'nom' => $nom])`.

### 6.2 Modifications de routes (`api/endpoints/roles.php`)

Ajouter dans `endpoint_roles` (avant les routes existantes) :

```php
$method === 'POST' && $id === null => dal_create_role($pdo, $ctx, $body['nom'] ?? '', $body['permission_ids'] ?? []),
$method === 'PUT' && $id !== null && $action === null => dal_update_role($pdo, $ctx, $id, $body['nom'] ?? ''),
```

### 6.3 Simplification de `dal_oeuvre_visibility_clause` (`api/dal/core.php`)

Remplacer la logique actuelle (if ABO3 / if ABO4 / else) par :

```php
function dal_oeuvre_visibility_clause(string $oeuvre_col, array $ctx, array &$params): string
{
    if (in_array('corpus.read_all', $ctx['permissions'] ?? [], true)) return '';

    $reserved = 'SELECT oeuvre_id FROM role_oeuvre_access';
    $role_id  = $ctx['role_id'] ?? ROLE_VISITEUR;

    if ($role_id === ROLE_ABO4) {
        // Cumul Abo3+Abo4 conservé (décision métier).
        $params[':ctx_abo3'] = ROLE_ABO3;
        $params[':ctx_abo4'] = ROLE_ABO4;
        return " AND ({$oeuvre_col} NOT IN ({$reserved})"
             . " OR {$oeuvre_col} IN (SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id IN (:ctx_abo3, :ctx_abo4)))";
    }

    // Tout autre rôle (Visiteur, Abo3, rôles personnalisés) :
    // public + réservées à CE rôle uniquement.
    $params[':ctx_role'] = $role_id;
    return " AND ({$oeuvre_col} NOT IN ({$reserved})"
         . " OR {$oeuvre_col} IN (SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id = :ctx_role))";
}
```

> La relation cumulative Abo3↔Abo4 est **conservée** (décision métier T14). Tout nouveau rôle personnalisé voit uniquement ses propres réservations.

### 6.4 Lever la restriction Abo3/Abo4 dans `dal_get_role_oeuvre_access` et `dal_set_role_oeuvre_access` (`api/dal/roles.php`)

Les deux fonctions refusent actuellement tout `role_id` différent de `ROLE_ABO3` / `ROLE_ABO4`. Supprimer cette restriction : tout rôle sans `corpus.read_all` doit pouvoir gérer des œuvres réservées.

- `dal_get_role_oeuvre_access` : supprimer la vérification de rôle autorisé, garder uniquement `dal_require_permission($ctx, 'admin.roles')`.
- `dal_set_role_oeuvre_access` : idem — supprimer la vérification `ROLE_ABO3 / ROLE_ABO4`, garder transaction DELETE+INSERT et permission check.

### 6.5 `apiClient` — méthode `del`

Vérifier que `src/services/api.ts` expose une fonction `del<T>`. Si non, l'ajouter sur le modèle de `put`.

## 7. Tests

### PHPUnit (`tests/dal/`)

- `RolesTest.php` (create) :
  - `test_create_role_with_permissions` — crée un rôle, vérifie BDD.
  - `test_update_role_nom` — renomme un rôle existant.
  - `test_update_role_admin_rejected` — update Admin → erreur.
  - `test_delete_role_with_users_rejected` — suppression refusée si utilisateurs affectés.
  - `test_oeuvre_visibility_custom_role` — un rôle personnalisé voit public + ses réservations uniquement.

### Vitest (`src/features/admin/__tests__/`)

- `RolesAccessPage.test.tsx` (réécriture) :
  - Sélectionner un rôle → charge la fiche.
  - Cocher `corpus.read_all` → section œuvres grisée.
  - Créer un rôle → appelle `createRole`, rôle ajouté à la liste.
  - Supprimer → `window.confirm` → appelle `deleteRole`.
  - Admin sélectionné → fiche en lecture seule (inputs disabled).

### Quality gate

`php -l api/dal/roles.php api/dal/core.php api/endpoints/roles.php` + `pnpm lint` + `pnpm test` + `pnpm build`.

## 8. Hors périmètre T15

- Réordonner les rôles dans la liste (ordre fixe : systèmes en premier, personnalisés ensuite, par création).
- Cloner un rôle existant.
- Gestion fine des conflits de permissions (ex. `atelier.lots` requiert `atelier.access` → pas de validation frontend en T15, uniquement backend).
- Endpoint `GET /api/permissions` (libellés hardcodés côté client).
