import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { z } from 'zod'
import { apiClient } from '@/services/api'

type Role = { id: number; nom: string }
type UserRow = {
  id: number
  prenom: string
  nom: string
  email: string
  role_id: number
  is_activated: boolean
}

const schema = z.object({
  prenom: z.string().min(1, 'Le prénom est requis.'),
  nom: z.string().min(1, 'Le nom est requis.'),
  email: z.string().email('Email invalide.'),
  role_id: z.number().int().positive('Rôle requis.'),
})

export function UserFormModal({
  open,
  user,
  roles,
  onClose,
  onSaved,
}: {
  open: boolean
  user: UserRow | null
  roles: Role[]
  onClose: () => void
  onSaved: () => void
}) {
  const [prenom, setPrenom] = useState(user?.prenom ?? '')
  const [nom, setNom] = useState(user?.nom ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [roleId, setRoleId] = useState<number>(user?.role_id ?? roles[0]?.id ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resent, setResent] = useState(false)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const parsed = schema.safeParse({ prenom, nom, email, role_id: roleId })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Saisie invalide.')
      return
    }
    setSubmitting(true)
    try {
      const payload = { prenom, nom, email, role_id: roleId }
      const res = user
        ? await apiClient.updateUser(user.id, payload)
        : await apiClient.createUser(payload)
      if (res.status === 'ok') {
        onSaved()
      } else {
        setError(res.errors?.[0] ?? "Erreur lors de l'enregistrement.")
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendInvite() {
    if (!user) return
    setError(null)
    setSending(true)
    try {
      const res = await apiClient.resendInvite(user.id)
      if (res.status === 'ok') {
        setResent(true)
      } else {
        setError(res.errors?.[0] ?? "Erreur lors de l'envoi.")
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSending(false)
    }
  }

  const fieldClass =
    'w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm'
  const labelClass = 'mb-1 block text-sm text-(--color-text-secondary)'
  const isEditing = user !== null
  const isPending = user !== null && !user.is_activated

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 w-[min(90vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-(--color-bg-card) p-5 shadow-lg"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <Dialog.Title className="mb-4 text-lg font-bold text-(--color-text-primary)">
            {isEditing ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'}
          </Dialog.Title>

          {/* Badge statut (mode édition seulement) */}
          {isEditing && (
            <div className="mb-4 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${isPending ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}
              >
                {isPending ? 'En attente' : 'Actif'}
              </span>
              {isPending && !resent && (
                <button
                  type="button"
                  onClick={handleResendInvite}
                  disabled={sending}
                  className="text-xs text-(--color-action) hover:underline disabled:opacity-50"
                >
                  {sending ? 'Envoi…' : "Renvoyer l'invitation"}
                </button>
              )}
              {resent && <span className="text-xs text-green-600">Invitation envoyée !</span>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className={labelClass} htmlFor="f-prenom">
                Prénom
              </label>
              <input
                id="f-prenom"
                className={fieldClass}
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="f-nom">
                Nom
              </label>
              <input
                id="f-nom"
                className={fieldClass}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="f-email">
                Email
              </label>
              <input
                id="f-email"
                type="email"
                className={fieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="f-role">
                Rôle
              </label>
              <select
                id="f-role"
                className={fieldClass}
                value={roleId}
                onChange={(e) => setRoleId(Number(e.target.value))}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Note pour la création */}
            {!isEditing && (
              <p className="text-xs text-(--color-text-secondary)">
                Un email d'invitation sera envoyé automatiquement pour que l'utilisateur définisse
                son mot de passe.
              </p>
            )}

            {error && <p className="text-sm text-(--color-danger-text)">{error}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-md px-3 py-2 text-sm text-(--color-text-secondary) disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-(--color-action) px-3 py-2 text-sm text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-50"
              >
                {submitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
