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
        <p className="mb-4 text-sm text-(--color-text-primary)">
          Mot de passe défini avec succès !
        </p>
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
