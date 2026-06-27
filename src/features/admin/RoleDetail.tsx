// src/features/admin/RoleDetail.tsx

import { useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { ROLE_VISITEUR } from '@/constants/roles'
import { PERMISSION_GROUPS } from './permissionGroups'

export type RoleDetailData = {
  id: number | null // null = nouveau rôle
  nom: string
  permissionIds: number[]
  oeuvreIds: number[]
  isProtected: boolean
  canDelete: boolean
  showOeuvres: boolean // true pour tous les rôles non-Admin
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
  const [nom, setNom] = useState(detail?.nom ?? '')
  const [permissionIds, setPermissionIds] = useState<number[]>(detail?.permissionIds ?? [])
  const [oeuvreIds, setOeuvreIds] = useState<number[]>(detail?.oeuvreIds ?? [])

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

  const corpusGroup = PERMISSION_GROUPS[0]!
  const otherGroups = PERMISSION_GROUPS.slice(1)

  function togglePermission(id: number) {
    if (detail!.isProtected) return
    setPermissionIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
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

      {/* Œuvres accessibles — pour tous les rôles non-Admin */}
      {detail.showOeuvres && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-(--color-text-placeholder)">
              Œuvres accessibles
            </span>
            <div className="h-px flex-1 bg-(--color-border)" />
          </div>
          <p className="mb-3 text-xs text-(--color-text-secondary)">
            {detail.id === ROLE_VISITEUR
              ? 'Cochez les œuvres que les visiteurs non connectés peuvent consulter.'
              : 'Cochez les œuvres que ce rôle peut consulter.'}
          </p>
          {oeuvres.length === 0 ? (
            <p className="text-xs text-(--color-text-placeholder)">Aucune œuvre disponible.</p>
          ) : (
            <div className="flex max-h-48 flex-wrap gap-x-6 gap-y-3 overflow-y-auto">
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
          )}
        </div>
      )}

      {/* Corpus — premier groupe */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-(--color-text-placeholder)">
            {corpusGroup.title}
          </span>
          <div className="h-px flex-1 bg-(--color-border)" />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {corpusGroup.permissions.map((perm) => (
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

      {/* Export, Atelier, Administration */}
      {otherGroups.map((group) => (
        <div key={group.title} className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-widest text-(--color-text-placeholder)">
              {group.title}
            </span>
            <div className="h-px flex-1 bg-(--color-border)" />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
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

      {/* Actions */}
      {!detail.isProtected && (
        <div className="mt-6 flex items-center justify-between border-t border-(--color-border) pt-4">
          <button
            onClick={() => onSave({ nom, permissionIds, oeuvreIds })}
            disabled={!nom.trim()}
            className="rounded-md bg-(--color-action) px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-(--color-action-hover) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enregistrer
          </button>
          {detail.id !== null && detail.canDelete && (
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
