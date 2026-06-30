import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { apiClient } from '@/services/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.includes('@')) {
      setError('Adresse email invalide.')
      return
    }
    setSubmitting(true)
    try {
      const res = await apiClient.forgotPassword(email)
      if (res.status === 'ok') {
        setSent(true)
      } else {
        setError(res.errors?.[0] ?? 'Une erreur est survenue.')
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6">
        <h1 className="mb-4 text-xl font-bold text-(--color-text-primary)">Email envoyé</h1>
        <p className="text-sm text-(--color-text-secondary)">
          Si un compte existe pour cette adresse, un email vient d'être envoyé avec un lien valable
          1 heure.
        </p>
        <Link
          to="/login"
          className="mt-4 block text-center text-sm text-(--color-action) hover:underline"
        >
          Retour à la connexion
        </Link>
      </div>
    )
  }

  const fieldClass =
    'w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary)'

  return (
    <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6">
      <h1 className="mb-4 text-xl font-bold text-(--color-text-primary)">Mot de passe oublié</h1>
      <p className="mb-4 text-sm text-(--color-text-secondary)">
        Saisissez votre adresse email. Vous recevrez un lien pour choisir un nouveau mot de passe.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="fp-email" className="text-sm text-(--color-text-secondary)">
            Email
          </label>
          <input
            id="fp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            autoComplete="email"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || email === ''}
          className="rounded-md bg-(--color-action) px-4 py-2 text-sm font-medium text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-60"
        >
          {submitting ? 'Envoi…' : 'Envoyer le lien'}
        </button>

        <Link
          to="/login"
          className="text-center text-sm text-(--color-text-secondary) hover:underline"
        >
          Retour à la connexion
        </Link>
      </form>
    </div>
  )
}
