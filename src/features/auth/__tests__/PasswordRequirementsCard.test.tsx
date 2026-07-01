import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PasswordRequirementsCard } from '../PasswordRequirementsCard'
import { evaluatePasswordConditions } from '../passwordPolicy'
import { ROLE_ADMIN, ROLE_ABO3 } from '@/constants/roles'

const NOBODY = { prenom: '', nom: '', email: '' }

describe('PasswordRequirementsCard', () => {
  it(`affiche un en-tête « sécurité renforcée » pour un rôle privilégié`, () => {
    const conditions = evaluatePasswordConditions('', ROLE_ADMIN, 'weak', NOBODY)
    render(
      <PasswordRequirementsCard conditions={conditions} roleLabel="Administrateur" isPrivileged />,
    )
    expect(screen.getByText(/Compte Administrateur — sécurité renforcée/)).toBeInTheDocument()
  })

  it(`affiche un en-tête « sécurité standard » pour un rôle non privilégié`, () => {
    const conditions = evaluatePasswordConditions('', ROLE_ABO3, 'weak', NOBODY)
    render(
      <PasswordRequirementsCard conditions={conditions} roleLabel="Abo3" isPrivileged={false} />,
    )
    expect(screen.getByText(/Compte Abo3 — sécurité standard/)).toBeInTheDocument()
  })

  it(`affiche le décompte de caractères restants tant que le minimum n'est pas atteint`, () => {
    const conditions = evaluatePasswordConditions('abc', ROLE_ABO3, 'weak', NOBODY)
    render(
      <PasswordRequirementsCard conditions={conditions} roleLabel="Abo3" isPrivileged={false} />,
    )
    expect(screen.getByText('Encore 5 caractères')).toBeInTheDocument()
  })

  it(`affiche la longueur minimale une fois atteinte`, () => {
    const conditions = evaluatePasswordConditions('abcdefgh', ROLE_ABO3, 'weak', NOBODY)
    render(
      <PasswordRequirementsCard conditions={conditions} roleLabel="Abo3" isPrivileged={false} />,
    )
    expect(screen.getByText('Au moins 8 caractères')).toBeInTheDocument()
  })

  it(`annonce le nombre de conditions remplies pour les lecteurs d'écran`, () => {
    const conditions = evaluatePasswordConditions('Pluie&Soleil99!', ROLE_ADMIN, 'strong', NOBODY)
    render(
      <PasswordRequirementsCard conditions={conditions} roleLabel="Administrateur" isPrivileged />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('4 conditions sur 4 remplies')
  })
})
