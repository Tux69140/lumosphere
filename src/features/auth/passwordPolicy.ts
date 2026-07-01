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
