import { describe, it, expect } from 'vitest'
import {
  getMinLength,
  getRequiredStrength,
  isPrivilegedRole,
  isBlacklisted,
  isSimilarToUserInfo,
  evaluatePasswordConditions,
  allConditionsMet,
} from '../passwordPolicy'
import { ROLE_ADMIN, ROLE_EDITEUR, ROLE_ABO3, ROLE_VISITEUR } from '@/constants/roles'

const NOBODY = { prenom: '', nom: '', email: '' }

describe('isPrivilegedRole', () => {
  it('est vrai pour Admin et Éditeur', () => {
    expect(isPrivilegedRole(ROLE_ADMIN)).toBe(true)
    expect(isPrivilegedRole(ROLE_EDITEUR)).toBe(true)
  })

  it('est faux pour les autres rôles', () => {
    expect(isPrivilegedRole(ROLE_ABO3)).toBe(false)
    expect(isPrivilegedRole(ROLE_VISITEUR)).toBe(false)
  })
})

describe('getMinLength', () => {
  it('vaut 12 pour un rôle privilégié, 8 sinon', () => {
    expect(getMinLength(ROLE_ADMIN)).toBe(12)
    expect(getMinLength(ROLE_ABO3)).toBe(8)
  })
})

describe('getRequiredStrength', () => {
  it('vaut "strong" pour un rôle privilégié, "medium" sinon', () => {
    expect(getRequiredStrength(ROLE_EDITEUR)).toBe('strong')
    expect(getRequiredStrength(ROLE_ABO3)).toBe('medium')
  })
})

describe('isBlacklisted', () => {
  it('rejette les mots de passe courants, insensible à la casse', () => {
    expect(isBlacklisted('motdepasse')).toBe(true)
    expect(isBlacklisted('MOTDEPASSE')).toBe(true)
  })

  it('accepte un mot de passe absent de la liste', () => {
    expect(isBlacklisted('Pluie&Soleil99!')).toBe(false)
  })
})

describe('isSimilarToUserInfo', () => {
  const info = { prenom: 'Jean', nom: 'Dupont', email: 'jean.dupont@test.com' }

  it('rejette un mot de passe contenant le prénom (≥ 4 caractères)', () => {
    expect(isSimilarToUserInfo('Jean1234!XYZ', info)).toBe(true)
  })

  it("rejette un mot de passe contenant la partie locale de l'email", () => {
    expect(
      isSimilarToUserInfo('testuser1234!A', {
        prenom: 'Jean',
        nom: 'Dupont',
        email: 'testuser@test.com',
      }),
    ).toBe(true)
  })

  it('ignore les fragments trop courts (< 4 caractères)', () => {
    expect(
      isSimilarToUserInfo('AbcJos1234!', { prenom: 'Jo', nom: 'Li', email: 'jo@test.com' }),
    ).toBe(false)
  })

  it("accepte un mot de passe sans lien avec l'utilisateur", () => {
    expect(isSimilarToUserInfo('Pluie&Soleil99!', info)).toBe(false)
  })
})

describe('evaluatePasswordConditions', () => {
  it('signale la longueur non atteinte avec le décompte restant', () => {
    const conditions = evaluatePasswordConditions('abc', ROLE_ABO3, 'weak', NOBODY)
    expect(conditions.length.ok).toBe(false)
    expect(conditions.length.remaining).toBe(5)
  })

  it('signale la longueur atteinte une fois le minimum franchi', () => {
    const conditions = evaluatePasswordConditions('abcdefgh', ROLE_ABO3, 'weak', NOBODY)
    expect(conditions.length.ok).toBe(true)
    expect(conditions.length.remaining).toBe(0)
  })

  it('exige le niveau "medium" pour un rôle standard', () => {
    const weak = evaluatePasswordConditions('abcdefgh', ROLE_ABO3, 'weak', NOBODY)
    const medium = evaluatePasswordConditions('abcdefgh', ROLE_ABO3, 'medium', NOBODY)
    expect(weak.strength.ok).toBe(false)
    expect(medium.strength.ok).toBe(true)
  })

  it('exige le niveau "strong" pour un rôle privilégié', () => {
    const medium = evaluatePasswordConditions('Abcdefghijkl1', ROLE_ADMIN, 'medium', NOBODY)
    const strong = evaluatePasswordConditions('Abcdefghijkl1', ROLE_ADMIN, 'strong', NOBODY)
    expect(medium.strength.ok).toBe(false)
    expect(strong.strength.ok).toBe(true)
  })

  it('signale notCommon et notSimilar comme non remplies pour un mot de passe vide', () => {
    const conditions = evaluatePasswordConditions('', ROLE_ABO3, 'weak', NOBODY)
    expect(conditions.notCommon.ok).toBe(false)
    expect(conditions.notSimilar.ok).toBe(false)
  })

  it('signale notCommon comme non remplie pour un mot de passe de la liste noire', () => {
    const conditions = evaluatePasswordConditions('motdepasse', ROLE_ABO3, 'strong', NOBODY)
    expect(conditions.notCommon.ok).toBe(false)
  })

  it('signale notSimilar comme non remplie quand le mot de passe contient le contexte utilisateur', () => {
    const conditions = evaluatePasswordConditions('Jean1234!XYZ', ROLE_ADMIN, 'strong', {
      prenom: 'Jean',
      nom: 'Dupont',
      email: 'jean@test.com',
    })
    expect(conditions.notSimilar.ok).toBe(false)
  })
})

describe('allConditionsMet', () => {
  it('est vrai seulement quand les 4 conditions sont remplies', () => {
    const met = evaluatePasswordConditions('Pluie&Soleil99!', ROLE_ADMIN, 'strong', NOBODY)
    expect(allConditionsMet(met)).toBe(true)

    const unmet = evaluatePasswordConditions('short', ROLE_ADMIN, 'weak', NOBODY)
    expect(allConditionsMet(unmet)).toBe(false)
  })
})
