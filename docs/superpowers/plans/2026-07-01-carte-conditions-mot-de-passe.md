# Carte des conditions de mot de passe — Plan d'implémentation

> **Pour les workers agentiques :** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** Afficher sur l'écran `SetPasswordPage` (invitation + renouvellement) une carte listant les 4 conditions du mot de passe (longueur avec décompte, robustesse, pas trop courant, pas de ressemblance nom/email), calculées en direct et adaptées au rôle du compte.

**Architecture :** L'endpoint `GET auth/token-info` renvoie désormais aussi `prenom`/`nom`/`email`/`role_nom`. Un module pur `src/features/auth/passwordPolicy.ts` reproduit côté client les règles de `api/dal/password_policy.php` (source de vérité) et calcule un objet `PasswordConditions` à chaque frappe. Un composant purement présentationnel `PasswordRequirementsCard` affiche cet objet. `SetPasswordPage` orchestre le tout et désactive le bouton de soumission jusqu'à ce que les 4 conditions + la confirmation soient réunies. Le serveur reste le juge final (aucun changement à `dal_password_validate`).

**Tech Stack :** PHP 8.1 (o2switch) · React 19 + TypeScript + Tailwind CSS · `@phosphor-icons/react` · `@zxcvbn-ts/core` (déjà en place) · Vitest + Testing Library

## Global Constraints

- Rôles : `ROLE_ADMIN=1`, `ROLE_EDITEUR=2`, `ROLE_VISITEUR=3`, `ROLE_ABO3=4`, `ROLE_ABO4=5` (constantes déjà définies dans `api/dal/core.php` et `src/constants/roles.ts`)
- Règle existante à reproduire à l'identique (ne pas la modifier) : privilégié (Admin/Éditeur) = longueur min **12** + robustesse **Fort** ; standard = longueur min **8** + robustesse **Moyen**
- Le serveur (`api/dal/password_policy.php` → `dal_password_validate()`) reste l'unique juge final ; le nouveau module client est un miroir, jamais une nouvelle source de règles
- Aucune migration SQL nécessaire — toutes les colonnes utilisées (`users.prenom/nom/email`, `roles.nom`) existent déjà
- Pas de test PHPUnit pour les fichiers `api/endpoints/*.php` dans ce projet (convention existante — seul `api/dal/*.php` est testé en PHPUnit) : la vérification du endpoint modifié se fait via `php -l`
- Commandes : `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm tsc --noEmit`, `php -l api/endpoints/auth.php`, `gitleaks detect -v` (bloquant)
- Commits : Conventional Commits — `feat|fix|test|refactor(scope): message`
- UI : icônes `@phosphor-icons/react` uniquement ; libellés en français avec accents corrects ; pas de nouvelle dépendance

---

## Cartographie des fichiers

### Fichiers modifiés
| Fichier | Changement |
|---|---|
| `api/endpoints/auth.php` | `_auth_token_info` (lignes 192-209) : jointure `roles`, renvoie aussi `prenom`, `nom`, `email`, `role_nom` |
| `src/services/api.ts` | `tokenInfo` (lignes 154-157) : type de retour étendu |
| `src/features/auth/SetPasswordPage.tsx` | Intègre `passwordPolicy` + `PasswordRequirementsCard`, retire l'ancienne logique ad hoc (`isPrivileged`, `minLength`, `canSubmit` local) |

### Nouveaux fichiers
| Fichier | Responsabilité |
|---|---|
| `src/features/auth/passwordPolicy.ts` | Miroir client des règles serveur : `getMinLength`, `getRequiredStrength`, `isBlacklisted`, `isSimilarToUserInfo`, `evaluatePasswordConditions`, `allConditionsMet` |
| `src/features/auth/__tests__/passwordPolicy.test.ts` | Tests unitaires du module ci-dessus |
| `src/features/auth/PasswordRequirementsCard.tsx` | Carte présentationnelle des 4 conditions |
| `src/features/auth/__tests__/PasswordRequirementsCard.test.tsx` | Tests du composant |
| `src/features/auth/__tests__/SetPasswordPage.test.tsx` | Test d'intégration de l'écran (jeton manquant, affichage carte, gating du bouton, soumission) |

### Fichier supprimé
| Fichier | Raison |
|---|---|
| `src/features/auth/PasswordStrengthMeter.tsx` | Absorbé dans `PasswordRequirementsCard` (seul appelant, `usePasswordStrength.ts` et son test restent inchangés) |

---

## Task 1 : Backend — `token-info` renvoie l'identité + le libellé de rôle

**Files :**
- Modify : `api/endpoints/auth.php` (fonction `_auth_token_info`, lignes 192-209)
- Modify : `src/services/api.ts` (méthode `tokenInfo`, lignes 154-157)

**Interfaces :**
- Produces : `GET auth/token-info?token=...` → `{ role_id: number, type: 'invite'|'reset', prenom: string, nom: string, email: string, role_nom: string }`
- Consumes : table `users` (colonnes `prenom`, `nom`, `email`, `role_id`), table `roles` (colonne `nom`), `dal_token_find_valid()` existant

- [ ] **Step 1 : Modifier `_auth_token_info` dans `api/endpoints/auth.php`**

Remplacer (lignes 192-209) :

```php
function _auth_token_info(PDO $pdo, string $raw_token): array
{
    if ($raw_token === '') {
        return dal_error('Jeton manquant.');
    }
    $token = dal_token_find_valid($pdo, $raw_token);
    if ($token === null) {
        return dal_error('Ce lien est invalide ou a expiré.');
    }
    // Charger le rôle de l'utilisateur pour que le frontend adapte la jauge de force
    $stmt = $pdo->prepare('SELECT role_id FROM users WHERE id = :id');
    $stmt->execute(['id' => $token['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        return dal_error('Utilisateur introuvable.');
    }
    return dal_ok(['role_id' => (int) $user['role_id'], 'type' => $token['type']]);
}
```

Par :

```php
function _auth_token_info(PDO $pdo, string $raw_token): array
{
    if ($raw_token === '') {
        return dal_error('Jeton manquant.');
    }
    $token = dal_token_find_valid($pdo, $raw_token);
    if ($token === null) {
        return dal_error('Ce lien est invalide ou a expiré.');
    }
    // Charger le rôle + l'identité pour que le frontend affiche la carte des conditions du mot de passe
    $stmt = $pdo->prepare(
        'SELECT u.role_id, u.prenom, u.nom, u.email, r.nom AS role_nom
         FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = :id'
    );
    $stmt->execute(['id' => $token['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        return dal_error('Utilisateur introuvable.');
    }
    return dal_ok([
        'role_id'  => (int) $user['role_id'],
        'type'     => $token['type'],
        'prenom'   => $user['prenom'],
        'nom'      => $user['nom'],
        'email'    => $user['email'],
        'role_nom' => $user['role_nom'],
    ]);
}
```

- [ ] **Step 2 : Vérifier la syntaxe PHP**

```bash
php -l api/endpoints/auth.php
```

Attendu : `No syntax errors detected`.

- [ ] **Step 3 : Étendre le type de retour dans `src/services/api.ts`**

Remplacer (lignes 154-157) :

```ts
  tokenInfo: (token: string) =>
    get<{ role_id: number; type: 'invite' | 'reset' }>(
      `auth/token-info?token=${encodeURIComponent(token)}`,
    ),
```

Par :

```ts
  tokenInfo: (token: string) =>
    get<{
      role_id: number
      type: 'invite' | 'reset'
      prenom: string
      nom: string
      email: string
      role_nom: string
    }>(`auth/token-info?token=${encodeURIComponent(token)}`),
```

- [ ] **Step 4 : Vérifier le typage TypeScript**

```bash
pnpm tsc --noEmit
```

Attendu : aucune erreur (la page `SetPasswordPage.tsx` n'est pas encore modifiée à cette étape, donc elle continue de n'utiliser que `role_id`/`type` — pas de régression).

- [ ] **Step 5 : Commit**

```bash
git add api/endpoints/auth.php src/services/api.ts
git commit -m "feat(auth): token-info renvoie prénom/nom/email/rôle pour la future carte de conditions"
```

---

## Task 2 : Module `passwordPolicy.ts` (miroir des règles serveur)

**Files :**
- Create : `src/features/auth/passwordPolicy.ts`
- Create : `src/features/auth/__tests__/passwordPolicy.test.ts`

**Interfaces :**
- Consumes : `StrengthLevel` de `@/hooks/usePasswordStrength` (`'weak' | 'medium' | 'strong'`), `ROLE_ADMIN`/`ROLE_EDITEUR` de `@/constants/roles`
- Produces :
  - `type UserContext = { prenom: string; nom: string; email: string }`
  - `type PasswordConditions = { length: { ok: boolean; min: number; remaining: number }, strength: { ok: boolean; level: StrengthLevel; required: StrengthLevel }, notCommon: { ok: boolean }, notSimilar: { ok: boolean } }`
  - `isPrivilegedRole(roleId: number): boolean`
  - `getMinLength(roleId: number): number`
  - `getRequiredStrength(roleId: number): StrengthLevel`
  - `isBlacklisted(password: string): boolean`
  - `isSimilarToUserInfo(password: string, info: UserContext): boolean`
  - `evaluatePasswordConditions(password: string, roleId: number, strengthLevel: StrengthLevel, info: UserContext): PasswordConditions`
  - `allConditionsMet(conditions: PasswordConditions): boolean`
  - Ces exports sont utilisés par `PasswordRequirementsCard` (Task 3) et `SetPasswordPage` (Task 4)

- [ ] **Step 1 : Écrire les tests en premier**

Créer `src/features/auth/__tests__/passwordPolicy.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import {
  getMinLength,
  getRequiredStrength,
  isPrivilegedRole,
  isBlacklisted,
  isSimilarToUserInfo,
  evaluatePasswordConditions,
  allConditionsMet,
} from '../passwordPolicy'
import { ROLE_ADMIN, ROLE_EDITEUR, ROLE_ABO3, ROLE_VISITEUR } from '@/constants/roles'

const NOBODY = { prenom: '', nom: '', email: '' }

describe('isPrivilegedRole', () => {
  it('est vrai pour Admin et Éditeur', () => {
    expect(isPrivilegedRole(ROLE_ADMIN)).toBe(true)
    expect(isPrivilegedRole(ROLE_EDITEUR)).toBe(true)
  })

  it('est faux pour les autres rôles', () => {
    expect(isPrivilegedRole(ROLE_ABO3)).toBe(false)
    expect(isPrivilegedRole(ROLE_VISITEUR)).toBe(false)
  })
})

describe('getMinLength', () => {
  it('vaut 12 pour un rôle privilégié, 8 sinon', () => {
    expect(getMinLength(ROLE_ADMIN)).toBe(12)
    expect(getMinLength(ROLE_ABO3)).toBe(8)
  })
})

describe('getRequiredStrength', () => {
  it('vaut "strong" pour un rôle privilégié, "medium" sinon', () => {
    expect(getRequiredStrength(ROLE_EDITEUR)).toBe('strong')
    expect(getRequiredStrength(ROLE_ABO3)).toBe('medium')
  })
})

describe('isBlacklisted', () => {
  it('rejette les mots de passe courants, insensible à la casse', () => {
    expect(isBlacklisted('motdepasse')).toBe(true)
    expect(isBlacklisted('MOTDEPASSE')).toBe(true)
  })

  it('accepte un mot de passe absent de la liste', () => {
    expect(isBlacklisted('Pluie&Soleil99!')).toBe(false)
  })
})

describe('isSimilarToUserInfo', () => {
  const info = { prenom: 'Jean', nom: 'Dupont', email: 'jean.dupont@test.com' }

  it('rejette un mot de passe contenant le prénom (≥ 4 caractères)', () => {
    expect(isSimilarToUserInfo('Jean1234!XYZ', info)).toBe(true)
  })

  it("rejette un mot de passe contenant la partie locale de l'email", () => {
    expect(
      isSimilarToUserInfo('testuser1234!A', { prenom: 'Jean', nom: 'Dupont', email: 'testuser@test.com' }),
    ).toBe(true)
  })

  it('ignore les fragments trop courts (< 4 caractères)', () => {
    expect(isSimilarToUserInfo('AbcJos1234!', { prenom: 'Jo', nom: 'Li', email: 'jo@test.com' })).toBe(
      false,
    )
  })

  it("accepte un mot de passe sans lien avec l'utilisateur", () => {
    expect(isSimilarToUserInfo('Pluie&Soleil99!', info)).toBe(false)
  })
})

describe('evaluatePasswordConditions', () => {
  it('signale la longueur non atteinte avec le décompte restant', () => {
    const conditions = evaluatePasswordConditions('abc', ROLE_ABO3, 'weak', NOBODY)
    expect(conditions.length.ok).toBe(false)
    expect(conditions.length.remaining).toBe(5)
  })

  it('signale la longueur atteinte une fois le minimum franchi', () => {
    const conditions = evaluatePasswordConditions('abcdefgh', ROLE_ABO3, 'weak', NOBODY)
    expect(conditions.length.ok).toBe(true)
    expect(conditions.length.remaining).toBe(0)
  })

  it('exige le niveau "medium" pour un rôle standard', () => {
    const weak = evaluatePasswordConditions('abcdefgh', ROLE_ABO3, 'weak', NOBODY)
    const medium = evaluatePasswordConditions('abcdefgh', ROLE_ABO3, 'medium', NOBODY)
    expect(weak.strength.ok).toBe(false)
    expect(medium.strength.ok).toBe(true)
  })

  it('exige le niveau "strong" pour un rôle privilégié', () => {
    const medium = evaluatePasswordConditions('Abcdefghijkl1', ROLE_ADMIN, 'medium', NOBODY)
    const strong = evaluatePasswordConditions('Abcdefghijkl1', ROLE_ADMIN, 'strong', NOBODY)
    expect(medium.strength.ok).toBe(false)
    expect(strong.strength.ok).toBe(true)
  })

  it('signale notCommon et notSimilar comme non remplies pour un mot de passe vide', () => {
    const conditions = evaluatePasswordConditions('', ROLE_ABO3, 'weak', NOBODY)
    expect(conditions.notCommon.ok).toBe(false)
    expect(conditions.notSimilar.ok).toBe(false)
  })

  it('signale notCommon comme non remplie pour un mot de passe de la liste noire', () => {
    const conditions = evaluatePasswordConditions('motdepasse', ROLE_ABO3, 'strong', NOBODY)
    expect(conditions.notCommon.ok).toBe(false)
  })

  it('signale notSimilar comme non remplie quand le mot de passe contient le contexte utilisateur', () => {
    const conditions = evaluatePasswordConditions('Jean1234!XYZ', ROLE_ADMIN, 'strong', {
      prenom: 'Jean',
      nom: 'Dupont',
      email: 'jean@test.com',
    })
    expect(conditions.notSimilar.ok).toBe(false)
  })
})

describe('allConditionsMet', () => {
  it('est vrai seulement quand les 4 conditions sont remplies', () => {
    const met = evaluatePasswordConditions('Pluie&Soleil99!', ROLE_ADMIN, 'strong', NOBODY)
    expect(allConditionsMet(met)).toBe(true)

    const unmet = evaluatePasswordConditions('short', ROLE_ADMIN, 'weak', NOBODY)
    expect(allConditionsMet(unmet)).toBe(false)
  })
})
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
pnpm vitest run src/features/auth/__tests__/passwordPolicy.test.ts
```

Attendu : FAIL — le module `../passwordPolicy` n'existe pas encore.

- [ ] **Step 3 : Implémenter `src/features/auth/passwordPolicy.ts`**

```ts
import { ROLE_ADMIN, ROLE_EDITEUR } from '@/constants/roles'
import type { StrengthLevel } from '@/hooks/usePasswordStrength'

// Miroir de PASSWORD_BLACKLIST dans api/dal/password_policy.php — garder les deux listes synchronisées.
const PASSWORD_BLACKLIST = [
  'password',
  'motdepasse',
  '12345678',
  '123456789',
  '1234567890',
  'password1',
  'qwerty',
  'azerty',
  'iloveyou',
  'lumosphere',
  'admin',
  'welcome',
  'letmein',
  'monkey',
  'dragon',
]

const STRENGTH_ORDER: Record<StrengthLevel, number> = { weak: 0, medium: 1, strong: 2 }

export type UserContext = {
  prenom: string
  nom: string
  email: string
}

export type PasswordConditions = {
  length: { ok: boolean; min: number; remaining: number }
  strength: { ok: boolean; level: StrengthLevel; required: StrengthLevel }
  notCommon: { ok: boolean }
  notSimilar: { ok: boolean }
}

export function isPrivilegedRole(roleId: number): boolean {
  return roleId === ROLE_ADMIN || roleId === ROLE_EDITEUR
}

export function getMinLength(roleId: number): number {
  return isPrivilegedRole(roleId) ? 12 : 8
}

export function getRequiredStrength(roleId: number): StrengthLevel {
  return isPrivilegedRole(roleId) ? 'strong' : 'medium'
}

export function isBlacklisted(password: string): boolean {
  return PASSWORD_BLACKLIST.includes(password.toLowerCase())
}

// Miroir de la règle de ressemblance dans api/dal/password_policy.php :
// prénom / nom / partie locale de l'email, retenus seulement si ≥ 4 caractères.
function contextWords({ prenom, nom, email }: UserContext): string[] {
  const emailLocal = email.split('@')[0] ?? ''
  return [prenom, nom, emailLocal].filter((w) => w.length >= 4).map((w) => w.toLowerCase())
}

export function isSimilarToUserInfo(password: string, info: UserContext): boolean {
  const lower = password.toLowerCase()
  return contextWords(info).some((word) => lower.includes(word))
}

export function evaluatePasswordConditions(
  password: string,
  roleId: number,
  strengthLevel: StrengthLevel,
  info: UserContext,
): PasswordConditions {
  const min = getMinLength(roleId)
  const required = getRequiredStrength(roleId)

  return {
    length: {
      ok: password.length >= min,
      min,
      remaining: Math.max(0, min - password.length),
    },
    strength: {
      ok: STRENGTH_ORDER[strengthLevel] >= STRENGTH_ORDER[required],
      level: strengthLevel,
      required,
    },
    notCommon: { ok: password.length > 0 && !isBlacklisted(password) },
    notSimilar: { ok: password.length > 0 && !isSimilarToUserInfo(password, info) },
  }
}

export function allConditionsMet(conditions: PasswordConditions): boolean {
  return (
    conditions.length.ok &&
    conditions.strength.ok &&
    conditions.notCommon.ok &&
    conditions.notSimilar.ok
  )
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
pnpm vitest run src/features/auth/__tests__/passwordPolicy.test.ts
```

Attendu : OK, tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
git add src/features/auth/passwordPolicy.ts src/features/auth/__tests__/passwordPolicy.test.ts
git commit -m "feat(auth): passwordPolicy.ts — miroir client des règles de mot de passe par rôle"
```

---

## Task 3 : Composant `PasswordRequirementsCard`

**Files :**
- Create : `src/features/auth/PasswordRequirementsCard.tsx`
- Create : `src/features/auth/__tests__/PasswordRequirementsCard.test.tsx`

**Interfaces :**
- Consumes : `PasswordConditions` de `./passwordPolicy` (Task 2)
- Produces : `PasswordRequirementsCard({ conditions: PasswordConditions, roleLabel: string, isPrivileged: boolean }): JSX.Element` — composant purement présentationnel, utilisé par `SetPasswordPage` (Task 4)

- [ ] **Step 1 : Écrire les tests en premier**

Créer `src/features/auth/__tests__/PasswordRequirementsCard.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PasswordRequirementsCard } from '../PasswordRequirementsCard'
import { evaluatePasswordConditions } from '../passwordPolicy'
import { ROLE_ADMIN, ROLE_ABO3 } from '@/constants/roles'

const NOBODY = { prenom: '', nom: '', email: '' }

describe('PasswordRequirementsCard', () => {
  it('affiche un en-tête « sécurité renforcée » pour un rôle privilégié', () => {
    const conditions = evaluatePasswordConditions('', ROLE_ADMIN, 'weak', NOBODY)
    render(<PasswordRequirementsCard conditions={conditions} roleLabel="Administrateur" isPrivileged />)
    expect(screen.getByText(/Compte Administrateur — sécurité renforcée/)).toBeInTheDocument()
  })

  it('affiche un en-tête « sécurité standard » pour un rôle non privilégié', () => {
    const conditions = evaluatePasswordConditions('', ROLE_ABO3, 'weak', NOBODY)
    render(<PasswordRequirementsCard conditions={conditions} roleLabel="Abo3" isPrivileged={false} />)
    expect(screen.getByText(/Compte Abo3 — sécurité standard/)).toBeInTheDocument()
  })

  it('affiche le décompte de caractères restants tant que le minimum n’est pas atteint', () => {
    const conditions = evaluatePasswordConditions('abc', ROLE_ABO3, 'weak', NOBODY)
    render(<PasswordRequirementsCard conditions={conditions} roleLabel="Abo3" isPrivileged={false} />)
    expect(screen.getByText('Encore 5 caractères')).toBeInTheDocument()
  })

  it('affiche la longueur minimale une fois atteinte', () => {
    const conditions = evaluatePasswordConditions('abcdefgh', ROLE_ABO3, 'weak', NOBODY)
    render(<PasswordRequirementsCard conditions={conditions} roleLabel="Abo3" isPrivileged={false} />)
    expect(screen.getByText('Au moins 8 caractères')).toBeInTheDocument()
  })

  it('annonce le nombre de conditions remplies pour les lecteurs d’écran', () => {
    const conditions = evaluatePasswordConditions('Pluie&Soleil99!', ROLE_ADMIN, 'strong', NOBODY)
    render(<PasswordRequirementsCard conditions={conditions} roleLabel="Administrateur" isPrivileged />)
    expect(screen.getByRole('status')).toHaveTextContent('4 conditions sur 4 remplies')
  })
})
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
pnpm vitest run src/features/auth/__tests__/PasswordRequirementsCard.test.tsx
```

Attendu : FAIL — le module `../PasswordRequirementsCard` n'existe pas encore.

- [ ] **Step 3 : Implémenter `src/features/auth/PasswordRequirementsCard.tsx`**

```tsx
import { CheckCircle, Circle, ShieldCheck } from '@phosphor-icons/react'
import type { PasswordConditions } from './passwordPolicy'

const STRENGTH_BAR: Record<string, { barClass: string; width: string }> = {
  weak: { barClass: 'bg-red-500', width: 'w-1/3' },
  medium: { barClass: 'bg-orange-400', width: 'w-2/3' },
  strong: { barClass: 'bg-green-500', width: 'w-full' },
}

const STRENGTH_LABEL: Record<string, string> = { weak: 'Faible', medium: 'Moyen', strong: 'Fort' }

type PasswordRequirementsCardProps = {
  conditions: PasswordConditions
  roleLabel: string
  isPrivileged: boolean
}

function ConditionIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle size={16} weight="fill" className="text-(--color-success-text)" aria-hidden="true" />
  ) : (
    <Circle size={16} className="text-(--color-text-placeholder)" aria-hidden="true" />
  )
}

export function PasswordRequirementsCard({
  conditions,
  roleLabel,
  isPrivileged,
}: PasswordRequirementsCardProps) {
  const metCount = [
    conditions.length.ok,
    conditions.strength.ok,
    conditions.notCommon.ok,
    conditions.notSimilar.ok,
  ].filter(Boolean).length

  const lengthText = conditions.length.ok
    ? `Au moins ${conditions.length.min} caractères`
    : conditions.length.remaining === 1
      ? 'Encore 1 caractère'
      : `Encore ${conditions.length.remaining} caractères`

  const strengthBar = STRENGTH_BAR[conditions.strength.level]

  return (
    <div className="mt-2 rounded-lg border border-(--color-border) bg-(--color-bg-card) p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-(--color-text-primary)">
        <ShieldCheck
          size={18}
          className={isPrivileged ? 'text-(--color-action)' : 'text-(--color-text-secondary)'}
          aria-hidden="true"
        />
        <span>
          Compte {roleLabel} — sécurité {isPrivileged ? 'renforcée' : 'standard'}
        </span>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {metCount} condition{metCount === 1 ? '' : 's'} sur 4 remplie{metCount === 1 ? '' : 's'}
      </p>

      <ul className="flex flex-col gap-2 text-sm text-(--color-text-secondary)">
        <li className="flex items-center gap-2">
          <ConditionIcon ok={conditions.length.ok} />
          <span>{lengthText}</span>
        </li>

        <li className="flex items-center gap-2">
          <ConditionIcon ok={conditions.strength.ok} />
          <span>Robustesse : {STRENGTH_LABEL[conditions.strength.required]} requis</span>
          <span className="ml-auto h-1.5 w-10 overflow-hidden rounded-full bg-(--color-border)">
            <span className={`block h-full rounded-full ${strengthBar.barClass} ${strengthBar.width}`} />
          </span>
        </li>

        <li className="flex items-center gap-2">
          <ConditionIcon ok={conditions.notCommon.ok} />
          <span>Pas un mot de passe trop courant</span>
        </li>

        <li className="flex items-center gap-2">
          <ConditionIcon ok={conditions.notSimilar.ok} />
          <span>Ne ressemble pas à votre prénom, nom ou email</span>
        </li>
      </ul>
    </div>
  )
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
pnpm vitest run src/features/auth/__tests__/PasswordRequirementsCard.test.tsx
```

Attendu : OK, tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
git add src/features/auth/PasswordRequirementsCard.tsx src/features/auth/__tests__/PasswordRequirementsCard.test.tsx
git commit -m "feat(auth): PasswordRequirementsCard — carte des 4 conditions du mot de passe"
```

---

## Task 4 : Intégration dans `SetPasswordPage` + retrait de `PasswordStrengthMeter`

**Files :**
- Modify : `src/features/auth/SetPasswordPage.tsx` (fichier complet)
- Delete : `src/features/auth/PasswordStrengthMeter.tsx`
- Create : `src/features/auth/__tests__/SetPasswordPage.test.tsx`

**Interfaces :**
- Consumes : `evaluatePasswordConditions`, `allConditionsMet`, `isPrivilegedRole` de `./passwordPolicy` (Task 2) ; `PasswordRequirementsCard` (Task 3) ; `usePasswordStrength` (inchangé) ; `apiClient.tokenInfo`/`apiClient.setPassword` étendus (Task 1)

- [ ] **Step 1 : Écrire le test d'intégration en premier**

Créer `src/features/auth/__tests__/SetPasswordPage.test.tsx` :

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { SetPasswordPage } from '../SetPasswordPage'

const { mockCheck } = vi.hoisted(() => ({ mockCheck: vi.fn() }))
vi.mock('@zxcvbn-ts/core', () => ({
  ZxcvbnFactory: class {
    check(pwd: string) {
      return mockCheck(pwd)
    }
  },
}))

const { tokenInfo, setPassword } = vi.hoisted(() => ({
  tokenInfo: vi.fn(),
  setPassword: vi.fn(),
}))
vi.mock('@/services/api', () => ({ apiClient: { tokenInfo, setPassword } }))

const navigate = vi.fn()
vi.mock('react-router', async (orig) => ({
  ...(await orig<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))

function renderPage(search = '?token=abc123') {
  return render(
    <MemoryRouter initialEntries={[`/definir-mot-de-passe${search}`]}>
      <SetPasswordPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCheck.mockImplementation((pwd: string) => ({ score: pwd.length >= 12 ? 4 : 0 }))
})

describe('SetPasswordPage', () => {
  it('affiche « Lien invalide. » sans jeton', () => {
    renderPage('')
    expect(screen.getByText('Lien invalide.')).toBeInTheDocument()
  })

  it('affiche la carte des conditions adaptée au rôle Administrateur', async () => {
    tokenInfo.mockResolvedValue({
      status: 'ok',
      data: {
        role_id: 1,
        type: 'invite',
        prenom: 'Ada',
        nom: 'Lovelace',
        email: 'ada@test.com',
        role_nom: 'Administrateur',
      },
      errors: [],
    })
    renderPage()
    expect(await screen.findByText(/Compte Administrateur — sécurité renforcée/)).toBeInTheDocument()
  })

  it('désactive le bouton jusqu’à ce que les 4 conditions et la confirmation soient réunies, puis soumet', async () => {
    tokenInfo.mockResolvedValue({
      status: 'ok',
      data: {
        role_id: 1,
        type: 'invite',
        prenom: 'Ada',
        nom: 'Lovelace',
        email: 'ada@test.com',
        role_nom: 'Administrateur',
      },
      errors: [],
    })
    setPassword.mockResolvedValue({ status: 'ok', data: { message: 'ok' }, errors: [] })
    renderPage()
    await screen.findByText(/Compte Administrateur/)

    const u = userEvent.setup()
    const submit = screen.getByRole('button', { name: /définir mon mot de passe/i })
    expect(submit).toBeDisabled()

    await u.type(screen.getByLabelText('Mot de passe'), 'Pluie&Soleil99!Xy')
    await u.type(screen.getByLabelText('Confirmation'), 'Pluie&Soleil99!Xy')

    await waitFor(() => expect(submit).toBeEnabled())
    await u.click(submit)

    expect(setPassword).toHaveBeenCalledWith('abc123', 'Pluie&Soleil99!Xy')
    expect(await screen.findByText('Mot de passe défini avec succès !')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
pnpm vitest run src/features/auth/__tests__/SetPasswordPage.test.tsx
```

Attendu : FAIL (le label « Mot de passe » exact et la carte n'existent pas encore dans la version actuelle du composant).

- [ ] **Step 3 : Réécrire `src/features/auth/SetPasswordPage.tsx` en entier**

```tsx
import { useState, useEffect, type FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { apiClient } from '@/services/api'
import { usePasswordStrength } from '@/hooks/usePasswordStrength'
import { PasswordRequirementsCard } from './PasswordRequirementsCard'
import { evaluatePasswordConditions, allConditionsMet, isPrivilegedRole } from './passwordPolicy'

type TokenData = {
  roleId: number
  type: 'invite' | 'reset'
  prenom: string
  nom: string
  email: string
  roleNom: string
}

export function SetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(!token ? 'Lien invalide.' : null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const strength = usePasswordStrength(password)

  useEffect(() => {
    if (!token) return
    apiClient
      .tokenInfo(token)
      .then((res) => {
        if (res.status === 'ok' && res.data) {
          setTokenData({
            roleId: res.data.role_id,
            type: res.data.type,
            prenom: res.data.prenom,
            nom: res.data.nom,
            email: res.data.email,
            roleNom: res.data.role_nom,
          })
        } else {
          setTokenError(res.errors?.[0] ?? 'Ce lien est invalide ou a expiré.')
        }
      })
      .catch(() => setTokenError('Erreur réseau. Veuillez réessayer.'))
  }, [token])

  const title = tokenData?.type === 'reset' ? 'Nouveau mot de passe' : 'Définir mon mot de passe'

  const conditions = tokenData
    ? evaluatePasswordConditions(password, tokenData.roleId, strength, {
        prenom: tokenData.prenom,
        nom: tokenData.nom,
        email: tokenData.email,
      })
    : null

  const canSubmit =
    !submitting &&
    !!conditions &&
    allConditionsMet(conditions) &&
    password === confirm &&
    confirm.length > 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!conditions || !allConditionsMet(conditions)) {
      setError('Veuillez remplir toutes les conditions du mot de passe.')
      return
    }
    if (password !== confirm) {
      setError('La confirmation ne correspond pas.')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiClient.setPassword(token, password)
      if (res.status === 'ok') {
        setSuccess(true)
      } else {
        setError(res.errors?.[0] ?? 'Une erreur est survenue.')
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (tokenError) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6 text-center">
        <p className="text-sm text-(--color-danger-text)">{tokenError}</p>
        <p className="mt-2 text-sm text-(--color-text-secondary)">
          Demandez un nouvel envoi à l'administrateur ou utilisez{' '}
          <a href="/mot-de-passe-oublie" className="text-(--color-action) underline">
            Mot de passe oublié
          </a>
          .
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6 text-center">
        <p className="mb-4 text-sm text-(--color-text-primary)">Mot de passe défini avec succès !</p>
        <button
          onClick={() => navigate('/login')}
          className="rounded-md bg-(--color-action) px-4 py-2 text-sm text-(--color-action-text)"
        >
          Se connecter
        </button>
      </div>
    )
  }

  if (!tokenData || !conditions) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6">
        <p className="text-sm text-(--color-text-secondary)">Vérification du lien…</p>
      </div>
    )
  }

  const fieldClass =
    'w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary)'

  return (
    <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6">
      <h1 className="mb-4 text-xl font-bold text-(--color-text-primary)">{title}</h1>

      {error && (
        <div className="mb-4 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="sp-password" className="text-sm text-(--color-text-secondary)">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="sp-password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${fieldClass} pr-10`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? 'Masquer' : 'Afficher'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-(--color-text-placeholder)"
            >
              {showPwd ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <PasswordRequirementsCard
            conditions={conditions}
            roleLabel={tokenData.roleNom}
            isPrivileged={isPrivilegedRole(tokenData.roleId)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sp-confirm" className="text-sm text-(--color-text-secondary)">
            Confirmation
          </label>
          <input
            id="sp-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={fieldClass}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-(--color-action) px-4 py-2 text-sm font-medium text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-60"
        >
          {submitting ? 'Enregistrement…' : 'Définir mon mot de passe'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4 : Supprimer le composant devenu inutile**

```bash
git rm src/features/auth/PasswordStrengthMeter.tsx
```

(`usePasswordStrength.ts` et son test `src/hooks/__tests__/usePasswordStrength.test.ts` restent inchangés — seul le composant d'affichage disparaît, absorbé dans `PasswordRequirementsCard`.)

- [ ] **Step 5 : Vérifier que les tests passent**

```bash
pnpm vitest run src/features/auth/__tests__/SetPasswordPage.test.tsx
```

Attendu : OK, les 3 tests passent.

- [ ] **Step 6 : Lancer la suite complète + vérifications de qualité**

```bash
pnpm test
pnpm tsc --noEmit
pnpm lint
pnpm build
```

Attendu : tout passe, aucune régression (notamment `LoginPage.test.tsx` et `usePasswordStrength.test.ts` toujours au vert).

- [ ] **Step 7 : Gitleaks**

```bash
gitleaks detect -v
```

Attendu : aucun secret détecté.

- [ ] **Step 8 : Commit**

```bash
git add src/features/auth/SetPasswordPage.tsx src/features/auth/__tests__/SetPasswordPage.test.tsx
git commit -m "feat(auth): intègre la carte des conditions dans SetPasswordPage, retire PasswordStrengthMeter"
```

---

## Notes de portée

- **Renouvellement de mot de passe (`type=reset`)** : couvert par le même écran/composant, donc par les mêmes tests — aucune tâche séparée nécessaire.
- **Pas de nouveau test e2e Playwright** : le flux réel nécessite un jeton d'invitation valide, qui n'est jamais renvoyé au client par l'API (sécurité — seul le serveur l'utilise pour construire l'URL de l'email). C'est déjà le cas pour l'écran actuel (aucun test e2e existant sur `/definir-mot-de-passe`) ; le test d'intégration Vitest de la Task 4 couvre le parcours avec un jeton mocké.
- **`ForgotPasswordPage.tsx`** : non modifié — cet écran ne saisit pas de mot de passe, seulement un email.
