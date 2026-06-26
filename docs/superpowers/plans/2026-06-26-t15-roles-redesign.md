# T15 — Refonte « Rôles et droits » : gestion complète des rôles

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'écran « Rôles et droits » par un master-detail complet permettant de créer, modifier (nom + permissions) et supprimer des rôles, avec gestion des œuvres réservées pour tout rôle sans `corpus.read_all`.

**Architecture:** Backend PHP : 2 nouvelles fonctions DAL, suppression de la restriction Abo3/Abo4 sur les œuvres réservées, simplification de `dal_oeuvre_visibility_clause` pour supporter n'importe quel `role_id`. Frontend : 3 nouveaux composants React (`RoleList`, `RoleDetail`, `permissionGroups.ts`) + réécriture complète de `RolesAccessPage` + tests Vitest.

**Tech Stack:** PHP 8.1, PDO, PHPUnit · React 19, TypeScript, Tailwind CSS v4, Vitest, Testing Library, Radix-less (Phosphor Icons uniquement)

## Global Constraints

- PHP : `declare(strict_types=1)` obligatoire. PDO avec paramètres liés uniquement — jamais de concaténation SQL. Pattern de retour `dal_ok()` / `dal_error()`.
- Rôle Administrateur (`ROLE_ADMIN = 1`) protégé dans TOUTES les fonctions : non supprimable, non renommable, permissions non modifiables.
- Les 16 permissions sont hardcodées côté frontend dans `permissionGroups.ts` (pas d'endpoint `/api/permissions`).
- Labels UI en français avec accents corrects. Identifiants techniques en anglais.
- Tokens CSS uniquement pour les couleurs : `bg-(--color-action)` jamais de hex codé en dur dans les classes.
- Iconographie : Phosphor Icons uniquement (`@phosphor-icons/react`).
- La relation cumulative Abo3 ⊂ Abo4 dans `dal_oeuvre_visibility_clause` est CONSERVÉE (décision métier T14).
- Visiteur (`ROLE_VISITEUR = 3`) : jamais de section « Œuvres réservées » dans l'UI.
- Section « Œuvres réservées » grisée (pas supprimée) quand `corpus.read_all` est coché.
- `window.confirm` pour confirmation de suppression (pas de modale personnalisée).
- Quality gate avant commit : `php -l api/dal/roles.php api/dal/core.php api/endpoints/roles.php` + `pnpm lint` + `pnpm test` + `pnpm build`.

---

## Task 1 : Backend PHP — Nouvelles fonctions DAL, levée restriction Abo3/Abo4, nouvelles routes

**Files:**
- Modify: `api/dal/roles.php` — ajouter `dal_create_role`, `dal_update_role` ; retirer la restriction Abo3/Abo4 de `dal_set_role_oeuvre_access`
- Modify: `api/dal/core.php:78-99` — simplifier `dal_oeuvre_visibility_clause`
- Modify: `api/endpoints/roles.php` — ajouter routes `POST` et `PUT /{id}`
- Modify: `tests/dal/RolesTest.php` — ajouter tests create/update + reset_test_db en setUp
- Modify: `tests/dal/RoleOeuvreAccessTest.php` — remplacer le test de rejet non-abonné par un test de succès

**Interfaces:**
- Produces: `dal_create_role(PDO $pdo, array $ctx, string $nom, array $permission_ids): array` — retourne `dal_ok(['id' => int, 'nom' => string])`
- Produces: `dal_update_role(PDO $pdo, array $ctx, int $id, string $nom): array` — retourne `dal_ok(['id' => int, 'nom' => string])`
- Produces: route `POST /api/roles` body `{nom, permission_ids[]}` → create
- Produces: route `PUT /api/roles/{id}` body `{nom}` → rename

- [ ] **Étape 1 : Ajouter les tests PHPUnit pour `dal_create_role` et `dal_update_role`**

Ajouter `reset_test_db($this->pdo)` dans `RolesTest::setUp()` et ajouter les 4 nouvelles méthodes de test :

```php
// tests/dal/RolesTest.php — modifier setUp + ajouter à la fin de la classe

protected function setUp(): void
{
    $this->pdo = get_test_pdo();
    reset_test_db($this->pdo);    // ← ajouter cette ligne
}

public function test_create_role_with_permissions(): void
{
    $ctx = create_test_ctx(ROLE_ADMIN);
    $r = dal_create_role($this->pdo, $ctx, 'Testeur', [1, 3]);
    $this->assertSame('ok', $r['status']);
    $this->assertIsInt($r['data']['id']);
    $this->assertSame('Testeur', $r['data']['nom']);

    // Vérifier que les permissions sont bien enregistrées
    $r2 = dal_get_role_with_permissions($this->pdo, $ctx, $r['data']['id']);
    $this->assertCount(2, $r2['data']['permissions']);
}

public function test_create_role_empty_nom_rejected(): void
{
    $ctx = create_test_ctx(ROLE_ADMIN);
    $r = dal_create_role($this->pdo, $ctx, '   ', [1]);
    $this->assertSame('error', $r['status']);
}

public function test_update_role_nom(): void
{
    $ctx = create_test_ctx(ROLE_ADMIN);
    $r = dal_update_role($this->pdo, $ctx, ROLE_VISITEUR, 'Visiteur Renommé');
    $this->assertSame('ok', $r['status']);
    $this->assertSame('Visiteur Renommé', $r['data']['nom']);
}

public function test_update_admin_role_blocked(): void
{
    $ctx = create_test_ctx(ROLE_ADMIN);
    $r = dal_update_role($this->pdo, $ctx, ROLE_ADMIN, 'Nouveau Nom');
    $this->assertSame('error', $r['status']);
    $this->assertStringContainsString('Administrateur', $r['errors'][0]);
}
```

- [ ] **Étape 2 : Vérifier que les tests échouent**

```bash
cd /home/stef/Documents/Lulu/lumosphere
./vendor/bin/phpunit tests/dal/RolesTest.php --filter "test_create_role|test_update_role|test_update_admin"
```

Attendu : ERRORS — "Call to undefined function dal_create_role()"

- [ ] **Étape 3 : Implémenter `dal_create_role` et `dal_update_role` dans `api/dal/roles.php`**

Ajouter APRÈS la fonction `dal_update_role_permissions` (ligne ~82) et AVANT `dal_get_role_oeuvre_access` :

```php
function dal_create_role(PDO $pdo, array $ctx, string $nom, array $permission_ids): array
{
    dal_require_permission($ctx, 'admin.roles');
    $nom = trim($nom);
    if ($nom === '') {
        return dal_error('Le nom du rôle est requis.');
    }
    $ids = array_values(array_unique(array_filter(
        array_map('intval', $permission_ids),
        static fn (int $v): bool => $v > 0
    )));

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO roles (nom) VALUES (:nom)');
        $stmt->execute(['nom' => $nom]);
        $id = (int) $pdo->lastInsertId();
        $stmt = $pdo->prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :perm_id)');
        foreach ($ids as $perm_id) {
            $stmt->execute(['role_id' => $id, 'perm_id' => $perm_id]);
        }
        $pdo->commit();
        return dal_ok(['id' => $id, 'nom' => $nom]);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        return dal_error('Erreur lors de la création du rôle.');
    }
}

function dal_update_role(PDO $pdo, array $ctx, int $id, string $nom): array
{
    dal_require_permission($ctx, 'admin.roles');
    if ($id === ROLE_ADMIN) {
        return dal_error('Le rôle Administrateur ne peut pas être renommé.');
    }
    $nom = trim($nom);
    if ($nom === '') {
        return dal_error('Le nom du rôle est requis.');
    }
    $stmt = $pdo->prepare('UPDATE roles SET nom = :nom WHERE id = :id');
    $stmt->execute(['nom' => $nom, 'id' => $id]);
    return $stmt->rowCount() > 0
        ? dal_ok(['id' => $id, 'nom' => $nom])
        : dal_error('Rôle introuvable.');
}
```

- [ ] **Étape 4 : Vérifier que les 4 tests passent**

```bash
./vendor/bin/phpunit tests/dal/RolesTest.php --filter "test_create_role|test_update_role|test_update_admin"
```

Attendu : 4 tests PASS

- [ ] **Étape 5 : Retirer la restriction Abo3/Abo4 de `dal_set_role_oeuvre_access` dans `api/dal/roles.php`**

Supprimer le bloc lignes 102-104 :

```php
// SUPPRIMER CES 3 LIGNES :
    if (!in_array($role_id, [ROLE_ABO3, ROLE_ABO4], true)) {
        return dal_error('Seuls les rôles Abo3 et Abo4 peuvent se voir réserver des œuvres.');
    }
```

- [ ] **Étape 6 : Mettre à jour `RoleOeuvreAccessTest.php` — remplacer le test de rejet**

Remplacer `test_set_rejects_non_subscriber_role` par :

```php
public function test_set_editeur_oeuvres_succeeds(): void
{
    $ctx = create_test_ctx(ROLE_ADMIN);
    $a = dal_create_auteur($this->pdo, $ctx, ['nom' => 'A'])['data']['id'];
    $o = dal_create_oeuvre($this->pdo, $ctx, ['nom' => 'O', 'auteur_id' => $a])['data']['id'];

    // Tout rôle (y compris Éditeur) peut désormais recevoir des œuvres réservées.
    $r = dal_set_role_oeuvre_access($this->pdo, $ctx, ROLE_EDITEUR, [$o]);
    $this->assertSame('ok', $r['status']);
    $this->assertSame([$o], dal_get_role_oeuvre_access($this->pdo, $ctx, ROLE_EDITEUR)['data']['oeuvre_ids']);
}
```

Vérifier que la suite `RoleOeuvreAccessTest` passe toujours :

```bash
./vendor/bin/phpunit tests/dal/RoleOeuvreAccessTest.php
```

Attendu : 3 tests PASS (get_returns_empty_then_set_replaces, test_set_editeur_oeuvres_succeeds, test_set_requires_admin_roles_permission)

- [ ] **Étape 7 : Simplifier `dal_oeuvre_visibility_clause` dans `api/dal/core.php`**

Remplacer les lignes 78-99 (la fonction entière) par :

```php
/**
 * R8 — Œuvre visibility fragment (no état): public works plus works reserved
 * to this role. Abo4 cumulates Abo3+Abo4 (business decision T14).
 * Returns '' for roles with corpus.read_all.
 */
function dal_oeuvre_visibility_clause(string $oeuvre_col, array $ctx, array &$params): string
{
    if (in_array('corpus.read_all', $ctx['permissions'] ?? [], true)) {
        return '';
    }
    $role_id  = $ctx['role_id'] ?? ROLE_VISITEUR;
    $reserved = 'SELECT oeuvre_id FROM role_oeuvre_access';

    if ($role_id === ROLE_ABO4) {
        // Cumul Abo3+Abo4 conservé (décision métier T14).
        $params[':ctx_abo3'] = ROLE_ABO3;
        $params[':ctx_abo4'] = ROLE_ABO4;
        return " AND ({$oeuvre_col} NOT IN ({$reserved})"
             . " OR {$oeuvre_col} IN (SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id IN (:ctx_abo3, :ctx_abo4)))";
    }

    // Tout autre rôle (Abo3, Visiteur, rôles personnalisés) :
    // œuvres publiques + réservées spécifiquement à CE rôle.
    $params[':ctx_role'] = $role_id;
    return " AND ({$oeuvre_col} NOT IN ({$reserved})"
         . " OR {$oeuvre_col} IN (SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id = :ctx_role))";
}
```

- [ ] **Étape 8 : Vérifier que la suite complète de tests DAL passe**

```bash
./vendor/bin/phpunit tests/dal/
```

Attendu : toute la suite PASS (pas de régression)

- [ ] **Étape 9 : Ajouter les nouvelles routes dans `api/endpoints/roles.php`**

Ajouter les deux nouvelles entrées EN PREMIER dans le `match`, AVANT les lignes existantes `GET && $id !== null` et `PUT && $id !== null && $action === 'permissions'` :

```php
function endpoint_roles(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET'    && $id !== null && $action === 'oeuvres'       => dal_get_role_oeuvre_access($pdo, $ctx, $id),
        $method === 'PUT'    && $id !== null && $action === 'oeuvres'       => dal_set_role_oeuvre_access(
            $pdo, $ctx, $id, $body['oeuvre_ids'] ?? []
        ),
        $method === 'POST'   && $id === null                                => dal_create_role(
            $pdo, $ctx, $body['nom'] ?? '', $body['permission_ids'] ?? []
        ),
        $method === 'PUT'    && $id !== null && $action === null            => dal_update_role(
            $pdo, $ctx, $id, $body['nom'] ?? ''
        ),
        $method === 'GET'    && $id === null                                => dal_find_roles($pdo, $ctx),
        $method === 'GET'    && $id !== null                                => dal_get_role_with_permissions($pdo, $ctx, $id),
        $method === 'PUT'    && $id !== null && $action === 'permissions'   => dal_update_role_permissions(
            $pdo, $ctx, $id, $body['permission_ids'] ?? []
        ),
        $method === 'DELETE' && $id !== null                                => dal_delete_role($pdo, $ctx, $id),
        default                                                             => dal_error('Méthode non supportée.'),
    };
}
```

- [ ] **Étape 10 : Vérifier la syntaxe PHP**

```bash
php -l api/dal/roles.php api/dal/core.php api/endpoints/roles.php
```

Attendu : `No syntax errors detected` sur les 3 fichiers

- [ ] **Étape 11 : Relancer toute la suite DAL pour confirmer aucune régression**

```bash
./vendor/bin/phpunit tests/dal/
```

Attendu : toute la suite PASS

- [ ] **Étape 12 : Commit**

```bash
git add api/dal/roles.php api/dal/core.php api/endpoints/roles.php tests/dal/RolesTest.php tests/dal/RoleOeuvreAccessTest.php
git commit -m "feat(T15-1): dal_create_role, dal_update_role, routes POST/PUT /roles, levée restriction Abo3/Abo4"
```

---

## Task 2 : Frontend — Données statiques + extensions client API

**Files:**
- Create: `src/features/admin/permissionGroups.ts`
- Modify: `src/services/api.ts` — ajouter `createRole`, `updateRole`, `deleteRole`

**Interfaces:**
- Produces: `PERMISSION_GROUPS: PermissionGroup[]` exporté depuis `permissionGroups.ts`
- Produces: `apiClient.createRole(nom: string, permissionIds: number[])` → `Promise<ApiResponse<{ id: number; nom: string }>>`
- Produces: `apiClient.updateRole(id: number, nom: string)` → `Promise<ApiResponse<{ id: number; nom: string }>>`
- Produces: `apiClient.deleteRole(id: number)` → `Promise<ApiResponse<void>>`

- [ ] **Étape 1 : Créer `src/features/admin/permissionGroups.ts`**

```typescript
// src/features/admin/permissionGroups.ts

export type Permission = {
  id: number
  code: string
  label: string
}

export type PermissionGroup = {
  title: string
  permissions: Permission[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'Corpus',
    permissions: [
      { id: 1,  code: 'corpus.read',     label: 'Lire les publications' },
      { id: 2,  code: 'corpus.read_all', label: 'Voir tout le corpus (brouillons inclus)' },
      { id: 3,  code: 'corpus.write',    label: 'Créer et modifier des citations' },
      { id: 4,  code: 'corpus.delete',   label: 'Supprimer des citations' },
    ],
  },
  {
    title: 'Référentiels',
    permissions: [
      { id: 8,  code: 'oeuvres.manage',  label: 'Gérer les œuvres et auteurs' },
      { id: 9,  code: 'themes.manage',   label: 'Gérer les thèmes' },
      { id: 10, code: 'keywords.manage', label: 'Gérer les mots-clés' },
    ],
  },
  {
    title: 'Export',
    permissions: [
      { id: 11, code: 'export.request', label: 'Exporter (PDF / EPUB)' },
    ],
  },
  {
    title: 'Atelier',
    permissions: [
      { id: 12, code: 'atelier.access',   label: "Accéder à l'atelier" },
      { id: 13, code: 'atelier.lots',     label: 'Traiter des lots' },
      { id: 14, code: 'atelier.validate', label: 'Valider et intégrer au corpus' },
      { id: 15, code: 'atelier.sources',  label: 'Configurer les sources' },
    ],
  },
  {
    title: 'Administration',
    permissions: [
      { id: 5,  code: 'admin.users',    label: 'Gérer les utilisateurs' },
      { id: 6,  code: 'admin.roles',    label: 'Gérer les rôles et droits' },
      { id: 7,  code: 'admin.settings', label: 'Gérer la configuration' },
      { id: 16, code: 'admin.sessions', label: 'Voir les connexions / déconnecter' },
    ],
  },
]
```

- [ ] **Étape 2 : Ajouter les 3 méthodes dans `src/services/api.ts` — section `// Roles`**

Remplacer la section `// Roles` (lignes 182-188) par :

```typescript
  // Roles
  findRoles: () => get<unknown[]>('roles'),
  getRoleWithPermissions: (id: number) =>
    get<{ id: number; nom: string; permissions: { id: number; code: string }[] }>(`roles/${id}`),
  updateRolePermissions: (id: number, permissionIds: number[]) =>
    put<void>(`roles/${id}/permissions`, { permission_ids: permissionIds }),
  createRole: (nom: string, permissionIds: number[]) =>
    post<{ id: number; nom: string }>('roles', { nom, permission_ids: permissionIds }),
  updateRole: (id: number, nom: string) =>
    put<{ id: number; nom: string }>(`roles/${id}`, { nom }),
  deleteRole: (id: number) => del<void>(`roles/${id}`),
  getRoleOeuvres: (roleId: number) =>
    get<{ oeuvre_ids: number[] }>(`roles/${roleId}/oeuvres`),
  setRoleOeuvres: (roleId: number, oeuvreIds: number[]) =>
    put<{ oeuvre_ids: number[] }>(`roles/${roleId}/oeuvres`, { oeuvre_ids: oeuvreIds }),
```

- [ ] **Étape 3 : Vérifier la compilation TypeScript**

```bash
pnpm tsc --noEmit
```

Attendu : 0 erreurs

- [ ] **Étape 4 : Commit**

```bash
git add src/features/admin/permissionGroups.ts src/services/api.ts
git commit -m "feat(T15-2): permissionGroups statiques, createRole/updateRole/deleteRole dans apiClient"
```

---

## Task 3 : Frontend — Composants UI + tests

**Files:**
- Create: `src/features/admin/RoleList.tsx`
- Create: `src/features/admin/RoleDetail.tsx`
- Rewrite: `src/features/admin/RolesAccessPage.tsx`
- Rewrite: `src/features/admin/__tests__/RolesAccessPage.test.tsx`

**Interfaces:**
- Consumes: `PERMISSION_GROUPS` de `./permissionGroups`
- Consumes: `apiClient.{findRoles, findOeuvres, getRoleWithPermissions, getRoleOeuvres, createRole, updateRole, updateRolePermissions, setRoleOeuvres, deleteRole}`
- Consumes: `ROLE_ADMIN = 1`, `ROLE_VISITEUR = 3` de `@/constants/roles`

- [ ] **Étape 1 : Écrire les tests Vitest (fichier à remplacer intégralement)**

```typescript
// src/features/admin/__tests__/RolesAccessPage.test.tsx

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RolesAccessPage } from '../RolesAccessPage'

const MOCK_ROLES = [
  { id: 1, nom: 'Administrateur' },
  { id: 2, nom: 'Éditeur' },
  { id: 3, nom: 'Visiteur' },
]

vi.mock('@/services/api', () => ({
  apiClient: {
    findRoles: vi.fn().mockResolvedValue({ status: 'ok', data: MOCK_ROLES, errors: [] }),
    findOeuvres: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [{ id: 1, nom: 'Œuvre A', auteur_nom: 'X' }],
      errors: [],
    }),
    getRoleWithPermissions: vi.fn().mockResolvedValue({
      status: 'ok',
      data: { id: 2, nom: 'Éditeur', permissions: [{ id: 1 }, { id: 2 }] },
      errors: [],
    }),
    getRoleOeuvres: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { oeuvre_ids: [1] }, errors: [] }),
    createRole: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { id: 6, nom: 'Mon Rôle' }, errors: [] }),
    updateRole: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { id: 2, nom: 'Éditeur' }, errors: [] }),
    updateRolePermissions: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: null, errors: [] }),
    setRoleOeuvres: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { oeuvre_ids: [] }, errors: [] }),
    deleteRole: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { apiClient } from '@/services/api'

beforeEach(() => vi.clearAllMocks())

describe('RolesAccessPage', () => {
  it('affiche la liste des rôles au chargement', async () => {
    render(<RolesAccessPage />)
    await waitFor(() => expect(screen.getByText('Administrateur')).toBeInTheDocument())
    expect(screen.getByText('Éditeur')).toBeInTheDocument()
    expect(screen.getByText('Visiteur')).toBeInTheDocument()
  })

  it('charge la fiche du rôle au clic', async () => {
    render(<RolesAccessPage />)
    await waitFor(() => screen.getByTestId('role-item-2'))
    await userEvent.click(screen.getByTestId('role-item-2'))
    await waitFor(() => expect(apiClient.getRoleWithPermissions).toHaveBeenCalledWith(2))
  })

  it('ouvre une fiche vierge au clic sur le bouton Créer', async () => {
    render(<RolesAccessPage />)
    await waitFor(() => screen.getByLabelText('Créer un nouveau rôle'))
    await userEvent.click(screen.getByLabelText('Créer un nouveau rôle'))
    await waitFor(() =>
      expect(
        (screen.getByPlaceholderText('Ex : Abonnés Premium') as HTMLInputElement).value,
      ).toBe(''),
    )
  })

  it('appelle createRole lors de l\'enregistrement d\'un nouveau rôle', async () => {
    render(<RolesAccessPage />)
    await waitFor(() => screen.getByLabelText('Créer un nouveau rôle'))
    await userEvent.click(screen.getByLabelText('Créer un nouveau rôle'))
    await userEvent.type(screen.getByPlaceholderText('Ex : Abonnés Premium'), 'Mon Rôle')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() =>
      expect(apiClient.createRole).toHaveBeenCalledWith('Mon Rôle', expect.any(Array)),
    )
  })

  it('Admin sélectionné : champ nom désactivé', async () => {
    vi.mocked(apiClient.getRoleWithPermissions).mockResolvedValueOnce({
      status: 'ok',
      data: { id: 1, nom: 'Administrateur', permissions: [{ id: 1 }] },
      errors: [],
    })
    vi.mocked(apiClient.getRoleOeuvres).mockResolvedValueOnce({
      status: 'ok',
      data: { oeuvre_ids: [] },
      errors: [],
    })
    render(<RolesAccessPage />)
    await waitFor(() => screen.getByTestId('role-item-1'))
    await userEvent.click(screen.getByTestId('role-item-1'))
    await waitFor(() => screen.getByDisplayValue('Administrateur'))
    expect((screen.getByLabelText('Nom du rôle') as HTMLInputElement).disabled).toBe(true)
  })

  it('suppression : appelle deleteRole après confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    vi.mocked(apiClient.getRoleWithPermissions).mockResolvedValueOnce({
      status: 'ok',
      data: { id: 2, nom: 'Éditeur', permissions: [{ id: 1 }] },
      errors: [],
    })
    vi.mocked(apiClient.getRoleOeuvres).mockResolvedValueOnce({
      status: 'ok',
      data: { oeuvre_ids: [] },
      errors: [],
    })
    render(<RolesAccessPage />)
    await waitFor(() => screen.getByTestId('role-item-2'))
    await userEvent.click(screen.getByTestId('role-item-2'))
    await waitFor(() => screen.getByRole('button', { name: /supprimer ce rôle/i }))
    await userEvent.click(screen.getByRole('button', { name: /supprimer ce rôle/i }))
    await waitFor(() => expect(apiClient.deleteRole).toHaveBeenCalledWith(2))
  })
})
```

- [ ] **Étape 2 : Vérifier que les tests échouent**

```bash
pnpm test src/features/admin/__tests__/RolesAccessPage.test.tsx
```

Attendu : FAIL — "RolesAccessPage is not a function" ou erreur d'import

- [ ] **Étape 3 : Créer `src/features/admin/RoleList.tsx`**

```tsx
// src/features/admin/RoleList.tsx

import { Lock, Plus } from '@phosphor-icons/react'
import { ROLE_ADMIN } from '@/constants/roles'

type Role = { id: number; nom: string }

type Props = {
  roles: Role[]
  selectedId: number | 'new' | null
  onSelect: (id: number) => void
  onNew: () => void
}

export function RoleList({ roles, selectedId, onSelect, onNew }: Props) {
  return (
    <aside className="flex w-56 shrink-0 flex-col">
      <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3">
        <h2 className="text-sm font-semibold text-(--color-text-primary)">Rôles</h2>
        <button
          onClick={onNew}
          className="rounded-md p-1 text-(--color-text-placeholder) transition-colors hover:bg-(--color-bg-button) hover:text-(--color-text-primary)"
          title="Créer un rôle"
          aria-label="Créer un nouveau rôle"
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {roles.map((role) => (
          <button
            key={role.id}
            data-testid={`role-item-${role.id}`}
            onClick={() => onSelect(role.id)}
            className={[
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
              selectedId === role.id
                ? 'bg-(--color-accent-bg) font-medium text-(--color-text-primary)'
                : 'text-(--color-text-secondary) hover:bg-(--color-bg-button) hover:text-(--color-text-primary)',
              role.id === ROLE_ADMIN && selectedId !== role.id ? 'font-medium' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {role.id === ROLE_ADMIN && (
              <Lock
                size={13}
                className="shrink-0 text-(--color-accent)"
                aria-hidden="true"
              />
            )}
            {role.nom}
          </button>
        ))}
        {selectedId === 'new' && (
          <div className="flex items-center gap-2 rounded-md bg-(--color-accent-bg) px-3 py-2 text-sm font-medium text-(--color-text-placeholder)">
            Nouveau rôle…
          </div>
        )}
      </nav>
    </aside>
  )
}
```

- [ ] **Étape 4 : Créer `src/features/admin/RoleDetail.tsx`**

```tsx
// src/features/admin/RoleDetail.tsx

import { useEffect, useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { PERMISSION_GROUPS } from './permissionGroups'

export type RoleDetailData = {
  id: number | null   // null = nouveau rôle
  nom: string
  permissionIds: number[]
  oeuvreIds: number[]
  isProtected: boolean
  showOeuvres: boolean
}

type Oeuvre = { id: number; nom: string; auteur_nom: string | null }

type SavePayload = { nom: string; permissionIds: number[]; oeuvreIds: number[] }

type Props = {
  detail: RoleDetailData | null
  loading: boolean
  oeuvres: Oeuvre[]
  onSave: (data: SavePayload) => void
  onDelete: (id: number) => void
}

export function RoleDetail({ detail, loading, oeuvres, onSave, onDelete }: Props) {
  const [nom, setNom] = useState('')
  const [permissionIds, setPermissionIds] = useState<number[]>([])
  const [oeuvreIds, setOeuvreIds] = useState<number[]>([])

  useEffect(() => {
    setNom(detail?.nom ?? '')
    setPermissionIds(detail?.permissionIds ?? [])
    setOeuvreIds(detail?.oeuvreIds ?? [])
  }, [detail])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-(--color-text-placeholder)">
        Chargement…
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-(--color-text-placeholder)">
        Sélectionnez un rôle ou créez-en un nouveau
      </div>
    )
  }

  const hasReadAll = permissionIds.includes(2) // corpus.read_all = id 2

  function togglePermission(id: number) {
    if (detail!.isProtected) return
    setPermissionIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  function toggleOeuvre(id: number) {
    setOeuvreIds((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]))
  }

  return (
    <div className="p-6">
      {/* Nom */}
      <div className="mb-6">
        <label
          className="mb-1 block text-sm font-medium text-(--color-text-primary)"
          htmlFor="role-nom"
        >
          Nom du rôle
        </label>
        <input
          id="role-nom"
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          disabled={detail.isProtected}
          placeholder="Ex : Abonnés Premium"
          aria-label="Nom du rôle"
          className="w-full max-w-xs rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-(--color-text-placeholder) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-action) disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Groupes de permissions */}
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.title} className="mb-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-(--color-text-placeholder)">
              {group.title}
            </span>
            <div className="h-px flex-1 bg-(--color-border)" />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {group.permissions.map((perm) => (
              <label
                key={perm.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-(--color-text-primary)"
              >
                <input
                  type="checkbox"
                  checked={permissionIds.includes(perm.id)}
                  onChange={() => togglePermission(perm.id)}
                  disabled={detail.isProtected}
                  aria-label={perm.label}
                  className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                  style={{ accentColor: 'var(--color-action)' }}
                />
                {perm.label}
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Œuvres réservées */}
      {detail.showOeuvres && (
        <div className="mb-5">
          <div className={hasReadAll ? 'pointer-events-none opacity-40' : ''}>
            <div className="mb-3 flex items-center gap-3">
              <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-(--color-text-placeholder)">
                Œuvres réservées
              </span>
              <div className="flex-1 border-t border-dashed border-(--color-border)" />
            </div>
            {hasReadAll && (
              <p className="mb-2 text-xs italic text-(--color-text-placeholder)">
                Ce rôle voit l'intégralité du corpus — les réservations d'œuvres ne s'appliquent
                pas.
              </p>
            )}
            <div className="flex max-h-48 flex-wrap gap-x-6 gap-y-2 overflow-y-auto">
              {oeuvres.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-2 text-sm text-(--color-text-primary)"
                >
                  <input
                    type="checkbox"
                    checked={oeuvreIds.includes(o.id)}
                    onChange={() => toggleOeuvre(o.id)}
                    aria-label={o.nom}
                    className="h-4 w-4 cursor-pointer"
                    style={{ accentColor: 'var(--color-action)' }}
                  />
                  {o.nom}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions (cachées pour Admin protégé) */}
      {!detail.isProtected && (
        <div className="mt-6 flex items-center justify-between border-t border-(--color-border) pt-4">
          <button
            onClick={() => onSave({ nom, permissionIds, oeuvreIds })}
            disabled={!nom.trim()}
            className="rounded-md bg-(--color-action) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enregistrer
          </button>
          {detail.id !== null && (
            <button
              onClick={() => onDelete(detail.id!)}
              className="flex items-center gap-1.5 text-sm text-(--color-danger-text) hover:underline"
            >
              <Trash size={14} aria-hidden="true" />
              Supprimer ce rôle
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Étape 5 : Réécrire `src/features/admin/RolesAccessPage.tsx`**

```tsx
// src/features/admin/RolesAccessPage.tsx

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { ROLE_ADMIN, ROLE_VISITEUR } from '@/constants/roles'
import { RoleList } from './RoleList'
import { RoleDetail } from './RoleDetail'
import type { RoleDetailData } from './RoleDetail'

type Role = { id: number; nom: string }
type Oeuvre = { id: number; nom: string; auteur_nom: string | null }

export function RolesAccessPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([])
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [detail, setDetail] = useState<RoleDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    Promise.all([apiClient.findRoles(), apiClient.findOeuvres()]).then(([rr, ro]) => {
      if (rr.status === 'ok') setRoles((rr.data ?? []) as Role[])
      else toast.error('Impossible de charger les rôles.')
      if (ro.status === 'ok') setOeuvres((ro.data ?? []) as Oeuvre[])
      else toast.error('Impossible de charger les œuvres.')
    })
  }, [])

  async function selectRole(id: number) {
    setSelectedId(id)
    setDetailLoading(true)
    const [rr, ro] = await Promise.all([
      apiClient.getRoleWithPermissions(id),
      apiClient.getRoleOeuvres(id),
    ])
    setDetailLoading(false)
    if (rr.status !== 'ok') {
      toast.error('Impossible de charger le rôle.')
      return
    }
    const role = rr.data as { id: number; nom: string; permissions: { id: number }[] }
    const permIds = role.permissions.map((p) => p.id)
    const oeuvreIds = (ro.data?.oeuvre_ids ?? []) as number[]
    const hasReadAll = permIds.includes(2) // corpus.read_all
    setDetail({
      id,
      nom: role.nom,
      permissionIds: permIds,
      oeuvreIds,
      isProtected: id === ROLE_ADMIN,
      showOeuvres: permIds.includes(1) && !hasReadAll && id !== ROLE_VISITEUR,
    })
  }

  function startNewRole() {
    setSelectedId('new')
    setDetail({
      id: null,
      nom: '',
      permissionIds: [1], // corpus.read pré-coché
      oeuvreIds: [],
      isProtected: false,
      showOeuvres: true,
    })
  }

  async function saveRole(data: { nom: string; permissionIds: number[]; oeuvreIds: number[] }) {
    if (!detail) return

    if (detail.id === null) {
      // Création
      const r = await apiClient.createRole(data.nom, data.permissionIds)
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Création impossible.')
        return
      }
      const newRole = r.data as { id: number; nom: string }
      setRoles((prev) => [...prev, newRole])
      await selectRole(newRole.id)
      toast.success(`Rôle « ${newRole.nom} » créé.`)
      return
    }

    // Mise à jour
    const id = detail.id
    const [rn, rp, ro] = await Promise.all([
      apiClient.updateRole(id, data.nom),
      apiClient.updateRolePermissions(id, data.permissionIds),
      detail.showOeuvres
        ? apiClient.setRoleOeuvres(id, data.oeuvreIds)
        : Promise.resolve({ status: 'ok' as const, data: null, errors: [] as string[] }),
    ])
    if (rn.status !== 'ok') { toast.error(rn.errors?.[0] ?? 'Renommage impossible.'); return }
    if (rp.status !== 'ok') { toast.error(rp.errors?.[0] ?? 'Mise à jour permissions impossible.'); return }
    if (ro.status !== 'ok') { toast.error((ro as { errors?: string[] }).errors?.[0] ?? 'Mise à jour œuvres impossible.'); return }
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, nom: data.nom } : r)))
    await selectRole(id)
    toast.success('Modifications enregistrées.')
  }

  async function deleteRole(id: number) {
    if (!window.confirm('Supprimer ce rôle ? Cette action est irréversible.')) return
    const r = await apiClient.deleteRole(id)
    if (r.status !== 'ok') {
      toast.error(r.errors?.[0] ?? 'Suppression impossible.')
      return
    }
    setRoles((prev) => prev.filter((role) => role.id !== id))
    setSelectedId(null)
    setDetail(null)
    toast.success('Rôle supprimé.')
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Rôles et droits</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Gérez les rôles, leurs permissions et leurs accès aux œuvres réservées.
      </p>
      <div className="flex min-h-[500px] overflow-hidden rounded-lg border border-(--color-border)">
        <RoleList
          roles={roles}
          selectedId={selectedId}
          onSelect={selectRole}
          onNew={startNewRole}
        />
        <div className="flex-1 overflow-y-auto border-l border-(--color-border)">
          <RoleDetail
            detail={detail}
            loading={detailLoading}
            oeuvres={oeuvres}
            onSave={saveRole}
            onDelete={deleteRole}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Étape 6 : Vérifier que les tests passent**

```bash
pnpm test src/features/admin/__tests__/RolesAccessPage.test.tsx
```

Attendu : 5 tests PASS

- [ ] **Étape 7 : Vérifier TypeScript + lint + build**

```bash
pnpm tsc --noEmit && pnpm lint && pnpm build
```

Attendu : 0 erreurs TS, 0 erreurs lint, build OK

- [ ] **Étape 8 : Commit**

```bash
git add src/features/admin/RoleList.tsx src/features/admin/RoleDetail.tsx src/features/admin/RolesAccessPage.tsx src/features/admin/__tests__/RolesAccessPage.test.tsx
git commit -m "feat(T15-3): refonte écran Rôles et droits — master-detail, create/edit/delete rôles"
```
