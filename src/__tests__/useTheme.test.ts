// src/__tests__/useTheme.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useTheme } from '@/hooks/useTheme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('useTheme', () => {
  it('defaults to auto', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('auto')
  })

  it('persists theme choice to localStorage', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('dark'))
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('applies dark class when theme is dark', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(result.current.resolvedTheme).toBe('dark')
  })

  it('removes dark class when theme is light', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('dark'))
    act(() => result.current.setTheme('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(result.current.resolvedTheme).toBe('light')
  })

  it('cycles light → dark → auto → light', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('light'))
    act(() => result.current.cycleTheme())
    expect(result.current.theme).toBe('dark')
    act(() => result.current.cycleTheme())
    expect(result.current.theme).toBe('auto')
    act(() => result.current.cycleTheme())
    expect(result.current.theme).toBe('light')
  })

  it('reads saved theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(result.current.resolvedTheme).toBe('dark')
  })
})
