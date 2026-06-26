import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { z } from 'zod'
import { apiClient } from '@/services/api'

type Role = { id: number; nom: string }
type UserRow = { id: number; prenom: string; nom: string; email: string; role_id: number }

const baseSchema = {
  prenom: z.string().min(1, 'Le prénom est requis.'),
  nom: z.string().min(1, 'Le nom est requis.'),
  email: z.string().email('Email invalide.'),
  role_id: z.number().int().positive('Rôle requis.'),
}

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
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    // Mot de passe : requis en création, optionnel en édition.
    const pwdSchema = user
      ? z
          .string()
          .refine(
            (v) => v === '' || v.length >= 8,
            'Le mot de passe doit faire au moins 8 caractères.',
          )
      : z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères.')
    const schema = z.object({ ...baseSchema, password: pwdSchema })
    const parsed = schema.safeParse({ prenom, nom, email, role_id: roleId, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Saisie invalide.')
      return
    }
    if (password !== confirm) {
      setError('La confirmation ne correspond pas.')
      return
    }
    const payload: Record<string, unknown> = { prenom, nom, email, role_id: roleId }
    if (password) payload.password = password
    const res = user
      ? await apiClient.updateUser(user.id, payload)
      : await apiClient.createUser(payload)
    if (res.status === 'ok') {
      setPassword('')
      setConfirm('')
      onSaved()
    } else {
      setError(res.errors?.[0] ?? "Erreur lors de l'enregistrement.")
    }
  }

  const fieldClass =
    'w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm'
  const labelClass = 'mb-1 block text-sm text-(--color-text-secondary)'

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
            {user ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'}
          </Dialog.Title>
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
            <div>
              <label className={labelClass} htmlFor="f-pwd">
                Mot de passe
              </label>
              <input
                id="f-pwd"
                type="password"
                className={fieldClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="f-confirm">
                Confirmation
              </label>
              <input
                id="f-confirm"
                type="password"
                className={fieldClass}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-(--color-danger-text)">{error}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-3 py-2 text-sm text-(--color-text-secondary)"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-md bg-(--color-action) px-3 py-2 text-sm text-(--color-action-text) hover:bg-(--color-action-hover)"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
