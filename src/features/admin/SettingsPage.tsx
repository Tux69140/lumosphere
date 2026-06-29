import { toast } from 'sonner'
import * as Switch from '@radix-ui/react-switch'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { queryKeys } from '@/services/queryKeys'

const DEBUG_KEY = 'mode_debug_global'

export function SettingsPage() {
  const qc = useQueryClient()

  const { data: debugRes, isLoading } = useQuery({
    queryKey: queryKeys.configKey(DEBUG_KEY),
    queryFn: () => apiClient.getConfig(DEBUG_KEY),
  })
  const debugOn = debugRes?.data === '1'

  const updateMut = useMutation({
    mutationFn: (value: string) => apiClient.setConfig(DEBUG_KEY, value),
    onSuccess: (r, value) => {
      if (r.status !== 'ok') {
        toast.error(r.errors?.[0] ?? 'Modification impossible.')
        return
      }
      qc.invalidateQueries({ queryKey: queryKeys.configKey(DEBUG_KEY) })
      toast.success(value === '1' ? 'Mode diagnostic activé.' : 'Mode diagnostic désactivé.')
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur réseau.'),
  })

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-(--color-text-primary)">Réglages</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Paramètres généraux de l’application.
      </p>

      <div className="rounded-lg border border-(--color-border)">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <label htmlFor="switch-debug" className="cursor-pointer">
            <span className="block text-sm font-medium text-(--color-text-primary)">
              Mode diagnostic
            </span>
            <span className="block text-xs text-(--color-text-secondary)">
              Conserve les dossiers de lots après leur intégration, pour investigation. À laisser
              désactivé en usage normal.
            </span>
          </label>
          <Switch.Root
            id="switch-debug"
            checked={debugOn}
            disabled={isLoading || updateMut.isPending}
            onCheckedChange={(checked) => updateMut.mutate(checked ? '1' : '0')}
            className="relative h-6 w-11 shrink-0 rounded-full bg-(--color-border) transition-colors data-[state=checked]:bg-(--color-action) disabled:opacity-50"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[1.375rem]" />
          </Switch.Root>
        </div>
      </div>
    </div>
  )
}
