import { Warning, XCircle } from '@phosphor-icons/react'

type Props = {
  type?: 'error' | 'warning'
  title?: string
  message: string
  details?: string[]
}

export function BlocErreur({ type = 'error', title, message, details }: Props) {
  const isError = type === 'error'
  const Icon = isError ? XCircle : Warning
  const bg = isError
    ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
    : 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
  const iconColor = isError
    ? 'text-red-500 dark:text-red-400'
    : 'text-amber-500 dark:text-amber-400'
  const textColor = isError
    ? 'text-red-800 dark:text-red-200'
    : 'text-amber-800 dark:text-amber-200'

  return (
    <div className={`rounded-lg border p-4 ${bg}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} weight="fill" className={`mt-0.5 shrink-0 ${iconColor}`} />
        <div className="min-w-0 flex-1">
          {title && <p className={`font-semibold ${textColor}`}>{title}</p>}
          <p className={`text-sm ${textColor}`}>{message}</p>
          {details && details.length > 0 && (
            <ul className={`mt-2 list-inside list-disc text-sm ${textColor}`}>
              {details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
