import { useState, useEffect } from 'react'

export type StrengthLevel = 'weak' | 'medium' | 'strong'

export function usePasswordStrength(password: string): StrengthLevel {
  // Tracks the last evaluated password + its score to avoid stale results
  const [state, setState] = useState<{ password: string; score: number }>({
    password: '',
    score: 0,
  })

  useEffect(() => {
    if (!password) return
    let cancelled = false
    void import('@zxcvbn-ts/core').then(({ ZxcvbnFactory }) => {
      if (!cancelled) {
        const lib = new ZxcvbnFactory({})
        const result = lib.check(password)
        setState({ password, score: result.score })
      }
    })
    return () => {
      cancelled = true
    }
  }, [password])

  // Derive 'weak' directly from the prop for empty input or while score is loading
  if (!password || state.password !== password) return 'weak'
  if (state.score <= 1) return 'weak'
  if (state.score === 2) return 'medium'
  return 'strong'
}
