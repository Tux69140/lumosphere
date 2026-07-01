import { CheckCircle, Circle, ShieldCheck } from '@phosphor-icons/react'
import type { PasswordConditions } from './passwordPolicy'

const STRENGTH_BAR: Record<'weak' | 'medium' | 'strong', { barClass: string; width: string }> = {
  weak: { barClass: 'bg-red-500', width: 'w-1/3' },
  medium: { barClass: 'bg-orange-400', width: 'w-2/3' },
  strong: { barClass: 'bg-green-500', width: 'w-full' },
}

const STRENGTH_LABEL: Record<'weak' | 'medium' | 'strong', string> = {
  weak: 'Faible',
  medium: 'Moyen',
  strong: 'Fort',
}

type PasswordRequirementsCardProps = {
  conditions: PasswordConditions
  roleLabel: string
  isPrivileged: boolean
}

function ConditionIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle
      size={16}
      weight="fill"
      className="text-(--color-success-text)"
      aria-hidden="true"
    />
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
            <span
              className={`block h-full rounded-full ${strengthBar.barClass} ${strengthBar.width}`}
            />
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
