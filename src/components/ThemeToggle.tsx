// src/components/ThemeToggle.tsx
import { Moon, Sun, CloudSun } from '@phosphor-icons/react'
import { useTheme } from '@/hooks/useTheme'

const ICON_SIZE = 22

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme()

  const icon =
    theme === 'light' ? (
      <Moon size={ICON_SIZE} />
    ) : theme === 'dark' ? (
      <CloudSun size={ICON_SIZE} />
    ) : (
      <Sun size={ICON_SIZE} />
    )

  const label =
    theme === 'light'
      ? 'Passer en mode sombre'
      : theme === 'dark'
        ? 'Passer en mode automatique'
        : 'Passer en mode clair'

  return (
    <button
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className="rounded-md p-2 text-(--color-icon-header) hover:bg-(--color-bg-button) transition-colors"
    >
      {icon}
    </button>
  )
}
