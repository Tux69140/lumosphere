import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebouncedValue', () => {
  it('retourne la valeur initiale immédiatement', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 500))
    expect(result.current).toBe('a')
  })

  it('met à jour seulement après le délai', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 500), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'b' })
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(499))
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('b')
  })
})
