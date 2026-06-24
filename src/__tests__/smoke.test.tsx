// src/__tests__/smoke.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router'
import { AppRoutes } from '../App'

describe('Smoke', () => {
  it('affiche le header avec Lumosphère', () => {
    render(
      <MemoryRouter>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByText('Lumosphère')).toBeInTheDocument()
  })
})
