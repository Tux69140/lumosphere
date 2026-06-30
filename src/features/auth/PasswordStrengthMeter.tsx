import { usePasswordStrength, type StrengthLevel } from '@/hooks/usePasswordStrength'

const config: Record<StrengthLevel, { label: string; barClass: string; width: string }> = {
  weak: { label: 'Faible', barClass: 'bg-red-500', width: 'w-1/3' },
  medium: { label: 'Moyen', barClass: 'bg-orange-400', width: 'w-2/3' },
  strong: { label: 'Fort', barClass: 'bg-green-500', width: 'w-full' },
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const level = usePasswordStrength(password)

  if (!password) return null

  const { label, barClass, width } = config[level]

  return (
    <div
      className="mt-1"
      role="status"
      aria-live="polite"
      aria-label={`Force du mot de passe : ${label}`}
    >
      <div className="h-1.5 rounded-full bg-(--color-border)">
        <div className={`h-full rounded-full transition-all duration-300 ${barClass} ${width}`} />
      </div>
      <p className="mt-0.5 text-xs text-(--color-text-secondary)">{label}</p>
    </div>
  )
}
