import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// vi.hoisted garantit que mockCheck est créé avant l'évaluation de vi.mock
const { mockCheck } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
}))

// ZxcvbnFactory v4 expose check() — utiliser class pour que `new ZxcvbnFactory()` fonctionne
vi.mock('@zxcvbn-ts/core', () => ({
  ZxcvbnFactory: class {
    check(pwd: string) {
      return mockCheck(pwd)
    }
  },
}))

import { usePasswordStrength } from '../usePasswordStrength'

describe('usePasswordStrength', () => {
  beforeEach(() => {
    mockCheck.mockImplementation((pwd: string) => {
      if (pwd === 'weak') return { score: 1 }
      if (pwd === 'medium') return { score: 2 }
      return { score: 4 }
    })
  })

  it('returns "weak" for empty password', () => {
    const { result } = renderHook(() => usePasswordStrength(''))
    expect(result.current).toBe('weak')
  })

  it('returns "weak" for score ≤ 1', async () => {
    const { result } = renderHook(() => usePasswordStrength('weak'))
    await waitFor(() => expect(result.current).toBe('weak'))
  })

  it('returns "medium" for score 2', async () => {
    const { result } = renderHook(() => usePasswordStrength('medium'))
    await waitFor(() => expect(result.current).toBe('medium'))
  })

  it('returns "strong" for score ≥ 3', async () => {
    const { result } = renderHook(() => usePasswordStrength('AStrongPassphrase!99'))
    await waitFor(() => expect(result.current).toBe('strong'))
  })
})
