# T08 — Squelette React : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser la coquille navigable de Lumosphère : layout responsive (header + sidebar + zone contenu), routage SPA, thème clair/sombre/auto avec la charte couleurs validée, et 6 vraies citations dans le corpus.

**Architecture:** React Router v7 pour le routage SPA. CSS custom properties pour la charte couleurs, basculées via la classe `dark` sur `<html>`. Hook `useTheme()` gère la persistance localStorage et la détection de la préférence système. Le client API (`src/services/api.ts`) existe déjà — la page d'accueil charge les citations via `apiClient.findCitations()`.

**Tech Stack:** React 19, Vite 8, TypeScript, Tailwind CSS v4, React Router v7, Phosphor Icons, Vitest, Playwright

## Global Constraints

- Icônes : Phosphor Icons uniquement
- UI labels : français avec accents corrects (é, è, ê, ç, à, ù, œ…)
- Identifiants techniques : anglais (`camelCase` fonctions, `PascalCase` composants)
- Pas de `import` runtime (Electron/Tauri) dans les composants React
- `fetch()` toujours avec `credentials: 'include'`
- Aucun secret en dur dans le code
- Tailwind v4 : pas de `tailwind.config.ts`, configuration via `@theme` dans `index.css`
- Alias `@/*` → `src/*` (configuré dans `tsconfig.json` et `vitest.config.ts`)
- Vitest config séparée dans `vitest.config.ts` (existe déjà), Vite config dans `vite.config.ts`
- Playwright config : `playwright.config.ts` (existe, teste sur `localhost:5173`)

---

### Task 1: Charte couleurs CSS + Tailwind

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Produces: CSS custom properties `--color-*` utilisables dans tout le CSS et via Tailwind `@theme`

- [ ] **Step 1: Écrire les variables CSS et la config Tailwind dans `index.css`**

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-bg-page: var(--color-bg-page);
  --color-bg-card: var(--color-bg-card);
  --color-bg-header: var(--color-bg-header);
  --color-bg-sidebar: var(--color-bg-sidebar);
  --color-bg-field: var(--color-bg-field);
  --color-bg-button: var(--color-bg-button);
  --color-text-primary: var(--color-text-primary);
  --color-text-secondary: var(--color-text-secondary);
  --color-text-placeholder: var(--color-text-placeholder);
  --color-text-header: var(--color-text-header);
  --color-text-header-secondary: var(--color-text-header-secondary);
  --color-link-header: var(--color-link-header);
  --color-icon-header: var(--color-icon-header);
  --color-action: var(--color-action);
  --color-action-hover: var(--color-action-hover);
  --color-action-text: var(--color-action-text);
  --color-accent: var(--color-accent);
  --color-accent-bg: var(--color-accent-bg);
  --color-accent-text: var(--color-accent-text);
  --color-tag-bg: var(--color-tag-bg);
  --color-tag-text: var(--color-tag-text);
  --color-border: var(--color-border);
  --color-border-header: var(--color-border-header);
  --color-success-bg: var(--color-success-bg);
  --color-success-text: var(--color-success-text);
  --color-warning: var(--color-warning);
  --color-warning-bg: var(--color-warning-bg);
  --color-warning-text: var(--color-warning-text);
  --color-danger: var(--color-danger);
  --color-danger-bg: var(--color-danger-bg);
  --color-danger-text: var(--color-danger-text);
}

:root {
  --color-bg-page: #f8fefc;
  --color-bg-card: #ffffff;
  --color-bg-header: #ffffff;
  --color-bg-sidebar: #f8fafc;
  --color-bg-field: #ffffff;
  --color-bg-button: #fff4f4;
  --color-text-primary: #3D3A35;
  --color-text-secondary: #706B63;
  --color-text-placeholder: #64748b;
  --color-text-header: #38444D;
  --color-text-header-secondary: #64748b;
  --color-link-header: #1e293b;
  --color-icon-header: #1e293b;
  --color-action: #2b4f35;
  --color-action-hover: #4338ca;
  --color-action-text: #ffffff;
  --color-accent: #D3B67B;
  --color-accent-bg: #ffffdf;
  --color-accent-text: #9a3412;
  --color-tag-bg: #ececff;
  --color-tag-text: #4338ca;
  --color-border: #e2e8f0;
  --color-border-header: #e2e8f0;
  --color-success-bg: #dcfce7;
  --color-success-text: #166534;
  --color-warning: #d97706;
  --color-warning-bg: #fef3c7;
  --color-warning-text: #92400e;
  --color-danger: #dc2626;
  --color-danger-bg: #fee2e2;
  --color-danger-text: #991b1b;
}

.dark {
  --color-bg-page: #0f172a;
  --color-bg-card: #1e293b;
  --color-bg-header: #1e293b;
  --color-bg-sidebar: #334155;
  --color-bg-field: #0f172a;
  --color-bg-button: #334155;
  --color-text-primary: #e2e8f0;
  --color-text-secondary: #cbd5e1;
  --color-text-placeholder: #94a3b8;
  --color-text-header: #f8fafc;
  --color-text-header-secondary: #cbd5e1;
  --color-link-header: #e2e8f0;
  --color-icon-header: #f8fafc;
  --color-action: #818cf8;
  --color-action-hover: #6366f1;
  --color-action-text: #0f172a;
  --color-accent: #fb923c;
  --color-accent-bg: #000040;
  --color-accent-text: #fdba74;
  --color-tag-bg: #312e81;
  --color-tag-text: #c7d2fe;
  --color-border: #475569;
  --color-border-header: #475569;
  --color-success-bg: #1f4d35;
  --color-success-text: #86efac;
  --color-warning: #f59e0b;
  --color-warning-bg: #4b3514;
  --color-warning-text: #fcd34d;
  --color-danger: #f87171;
  --color-danger-bg: #4f1d1d;
  --color-danger-text: #fecaca;
}

body {
  background-color: var(--color-bg-page);
  color: var(--color-text-primary);
}
```

- [ ] **Step 2: Vérifier que le build passe**

Run: `pnpm build`
Expected: BUILD SUCCESS, pas d'erreur CSS

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(T08): charte couleurs CSS custom properties + Tailwind theme"
```

---

### Task 2: Hook useTheme

**Files:**
- Create: `src/hooks/useTheme.ts`
- Create: `src/__tests__/useTheme.test.ts`

**Interfaces:**
- Produces: `useTheme()` → `{ theme: 'light' | 'dark' | 'auto', resolvedTheme: 'light' | 'dark', setTheme: (t) => void, cycleTheme: () => void }`

- [ ] **Step 1: Écrire le test**

```ts
// src/__tests__/useTheme.test.ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
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
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `pnpm test -- src/__tests__/useTheme.test.ts`
Expected: FAIL — module `@/hooks/useTheme` not found

- [ ] **Step 3: Implémenter le hook**

```ts
// src/hooks/useTheme.ts
import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'auto'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const CYCLE: Theme[] = ['light', 'dark', 'auto']

function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'auto' ? getSystemPreference() : theme
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'auto'
  })

  const resolvedTheme = resolveTheme(theme)

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme(resolveTheme('auto'))
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t)
    setThemeState(t)
  }, [])

  const cycleTheme = useCallback(() => {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]
    setTheme(next)
  }, [theme, setTheme])

  return { theme, resolvedTheme, setTheme, cycleTheme } as const
}
```

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm test -- src/__tests__/useTheme.test.ts`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTheme.ts src/__tests__/useTheme.test.ts
git commit -m "feat(T08): hook useTheme — 3 positions, localStorage, cycle"
```

---

### Task 3: React Router + pages squelettes + layouts

**Files:**
- Modify: `src/App.tsx`
- Create: `src/layouts/MainLayout.tsx`
- Create: `src/layouts/AuthLayout.tsx`
- Create: `src/features/accueil/AccueilPage.tsx`
- Create: `src/features/auth/LoginPage.tsx`
- Create: `src/features/admin/AdminPage.tsx`
- Create: `src/features/NotFoundPage.tsx`
- Create: `src/components/Header.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/ThemeToggle.tsx`
- Create: `src/components/CitationCard.tsx`
- Modify: `src/__tests__/smoke.test.tsx`

**Interfaces:**
- Consumes: `useTheme()` de Task 2, CSS custom properties de Task 1
- Consumes: `apiClient.findCitations()` de `src/services/api.ts` (existe)
- Produces: app routée avec layout complet, composants `Header`, `Sidebar`, `CitationCard`, `ThemeToggle`

- [ ] **Step 1: Installer React Router**

Run: `pnpm add react-router`
Expected: ajouté dans `dependencies`

- [ ] **Step 2: Créer ThemeToggle**

```tsx
// src/components/ThemeToggle.tsx
import { Moon, Sun, CloudSun } from '@phosphor-icons/react'
import { useTheme } from '@/hooks/useTheme'

const ICON_SIZE = 22

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme()

  const icon =
    theme === 'light' ? <Moon size={ICON_SIZE} /> :
    theme === 'dark' ? <CloudSun size={ICON_SIZE} /> :
    <Sun size={ICON_SIZE} />

  const label =
    theme === 'light' ? 'Passer en mode sombre' :
    theme === 'dark' ? 'Passer en mode automatique' :
    'Passer en mode clair'

  return (
    <button
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className="rounded-md p-2 text-(--color-icon-header) hover:bg-(--color-bg-button) transition-colors"
    >
      {icon}
    </button>
  )
}
```

- [ ] **Step 3: Créer Header**

```tsx
// src/components/Header.tsx
import { useState } from 'react'
import { Link } from 'react-router'
import { SunHorizon, List, X, SignIn } from '@phosphor-icons/react'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-(--color-border-header) bg-(--color-bg-header) px-4 py-3">
      <Link to="/" className="flex items-center gap-2 no-underline">
        <SunHorizon size={28} weight="fill" className="text-(--color-accent)" />
        <span className="text-lg font-bold text-(--color-text-header)">Lumosphère</span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-2 md:flex">
        <ThemeToggle />
        <Link
          to="/login"
          className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors"
        >
          <SignIn size={18} />
          <span>Connexion</span>
        </Link>
      </nav>

      {/* Mobile burger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="rounded-md p-2 text-(--color-icon-header) md:hidden"
        aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        {menuOpen ? <X size={24} /> : <List size={24} />}
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute left-0 right-0 top-full border-b border-(--color-border-header) bg-(--color-bg-header) p-4 md:hidden">
          <div className="flex flex-col gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-(--color-link-header) hover:bg-(--color-bg-button)"
            >
              <SignIn size={18} />
              <span>Connexion</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 4: Créer Sidebar**

```tsx
// src/components/Sidebar.tsx
import { MagnifyingGlass } from '@phosphor-icons/react'

export function Sidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-(--color-border) bg-(--color-bg-sidebar) p-4 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="mb-4">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-placeholder)"
          />
          <input
            type="text"
            placeholder="Rechercher dans le contenu…"
            disabled
            className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) py-2 pl-9 pr-3 text-sm text-(--color-text-placeholder) placeholder:text-(--color-text-placeholder)"
          />
        </div>
      </div>

      <div className="mb-3">
        <h3 className="mb-1 text-xs font-semibold uppercase text-(--color-text-secondary)">
          Œuvres
        </h3>
        <p className="text-xs text-(--color-text-placeholder)">Aucun filtre disponible</p>
      </div>

      <div className="mb-3">
        <h3 className="mb-1 text-xs font-semibold uppercase text-(--color-text-secondary)">
          Thèmes
        </h3>
        <p className="text-xs text-(--color-text-placeholder)">Aucun filtre disponible</p>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase text-(--color-text-secondary)">
          Mots-clés
        </h3>
        <p className="text-xs text-(--color-text-placeholder)">Aucun filtre disponible</p>
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: Créer CitationCard**

```tsx
// src/components/CitationCard.tsx
type CitationCardProps = {
  contenu: string
  auteur_nom: string | null
  theme_nom: string | null
  mots_cles: string[]
}

export function CitationCard({ contenu, auteur_nom, theme_nom, mots_cles }: CitationCardProps) {
  return (
    <article className="rounded-lg border border-(--color-border) bg-(--color-bg-card) p-4">
      {theme_nom && (
        <p className="mb-2 text-xs text-(--color-text-secondary)">
          Thème : {theme_nom}
        </p>
      )}
      <p className="mb-3 text-sm leading-relaxed text-(--color-text-primary) whitespace-pre-line">
        {contenu}
      </p>
      {auteur_nom && (
        <p className="mb-2 text-xs font-medium text-(--color-text-secondary)">
          — {auteur_nom}
        </p>
      )}
      {mots_cles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mots_cles.map((mc) => (
            <span
              key={mc}
              className="rounded-full bg-(--color-tag-bg) px-2.5 py-0.5 text-xs text-(--color-tag-text)"
            >
              {mc}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 6: Créer MainLayout**

```tsx
// src/layouts/MainLayout.tsx
import { Outlet } from 'react-router'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1 flex-col lg:flex-row">
        <Sidebar />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Créer AuthLayout**

```tsx
// src/layouts/AuthLayout.tsx
import { Outlet } from 'react-router'
import { Header } from '@/components/Header'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center p-4">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 8: Créer AccueilPage**

```tsx
// src/features/accueil/AccueilPage.tsx
import { useEffect, useState } from 'react'
import { apiClient } from '@/services/api'
import { CitationCard } from '@/components/CitationCard'

type Citation = {
  id: number
  contenu: string
  auteur_nom: string | null
  theme_nom: string | null
  mots_cles: { id: number; mot: string }[]
}

export function AccueilPage() {
  const [citations, setCitations] = useState<Citation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .findCitations()
      .then((res) => {
        if (res.status === 'ok' && res.data) {
          setCitations(res.data.items as Citation[])
        } else {
          setError(res.errors?.[0] ?? 'Erreur de chargement')
        }
      })
      .catch(() => setError('Impossible de contacter le serveur'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-(--color-text-secondary)">
          {loading ? 'Chargement…' : `${citations.length} entrée${citations.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">
          {error}
        </div>
      )}

      {!loading && !error && citations.length === 0 && (
        <p className="text-sm text-(--color-text-placeholder)">Aucune entrée</p>
      )}

      <div className="flex flex-col gap-4">
        {citations.map((c) => (
          <CitationCard
            key={c.id}
            contenu={c.contenu}
            auteur_nom={c.auteur_nom}
            theme_nom={c.theme_nom}
            mots_cles={c.mots_cles.map((k) => k.mot)}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Créer les pages placeholder**

```tsx
// src/features/auth/LoginPage.tsx
import { SignIn } from '@phosphor-icons/react'

export function LoginPage() {
  return (
    <div className="text-center">
      <SignIn size={48} className="mx-auto mb-4 text-(--color-text-placeholder)" />
      <h1 className="mb-2 text-xl font-bold text-(--color-text-primary)">Connexion</h1>
      <p className="text-sm text-(--color-text-secondary)">À venir (T09)</p>
    </div>
  )
}
```

```tsx
// src/features/admin/AdminPage.tsx
import { GearSix } from '@phosphor-icons/react'

export function AdminPage() {
  return (
    <div className="text-center">
      <GearSix size={48} className="mx-auto mb-4 text-(--color-text-placeholder)" />
      <h1 className="mb-2 text-xl font-bold text-(--color-text-primary)">Administration</h1>
      <p className="text-sm text-(--color-text-secondary)">À venir (T14)</p>
    </div>
  )
}
```

```tsx
// src/features/NotFoundPage.tsx
import { Link } from 'react-router'
import { Warning } from '@phosphor-icons/react'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <Warning size={48} className="mb-4 text-(--color-warning)" />
      <h1 className="mb-2 text-xl font-bold text-(--color-text-primary)">Page introuvable</h1>
      <Link to="/" className="text-sm text-(--color-action) hover:text-(--color-action-hover)">
        Retour à l'accueil
      </Link>
    </div>
  )
}
```

- [ ] **Step 10: Réécrire App.tsx avec le routeur**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AccueilPage } from '@/features/accueil/AccueilPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { NotFoundPage } from '@/features/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<AccueilPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 11: Mettre le titre dans index.html**

Modifier `index.html` : remplacer le contenu du `<title>` par `Lumosphère`.

- [ ] **Step 12: Adapter le smoke test**

```tsx
// src/__tests__/smoke.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router'
import App from '../App'

// App utilise BrowserRouter en interne, on doit tester les pages séparément
import { AccueilPage } from '@/features/accueil/AccueilPage'

describe('Smoke', () => {
  it('affiche le header avec Lumosphère', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('Lumosphère')).toBeInTheDocument()
  })
})
```

Note : `App` contient un `BrowserRouter` — le smoke test avec `MemoryRouter` va produire un double-routeur. Deux solutions : (a) extraire les routes dans un composant séparé qui prend un routeur en prop, ou (b) tester directement le layout/header. Choisir (a) au moment de l'implémentation si le test le nécessite : séparer `AppRoutes` (les `<Routes>`) de `App` (qui wrape dans `BrowserRouter`), et tester `AppRoutes` dans un `MemoryRouter`.

- [ ] **Step 13: Vérifier lint + build + tests**

Run: `pnpm lint && pnpm build && pnpm test`
Expected: tout PASS

- [ ] **Step 14: Commit**

```bash
git add src/ index.html
git commit -m "feat(T08): routage React Router, layouts, pages squelettes, composants UI"
```

---

### Task 4: Seed SQL — données de test dans le corpus

**Files:**
- Create: `db/seeds/seed_citations_test.sql`

**Interfaces:**
- Produces: 1 auteur, 1 œuvre, 6 citations, ~15 mots-clés dans le corpus (base `mist2786_lumosphere` sur le serveur)

- [ ] **Step 1: Écrire le script SQL**

```sql
-- db/seeds/seed_citations_test.sql
-- Seed T08 : 6 citations réelles depuis les lots Telegram exportés.
-- Exécuter sur le serveur : ssh lumosphere, puis mysql mist2786_lumosphere < seed_citations_test.sql
-- Idempotent : vérifie l'absence avant insertion.

START TRANSACTION;

-- 1. Auteur
INSERT INTO auteurs (nom, site)
SELECT 'Lulumineuse', 'https://lulumineuse.com'
WHERE NOT EXISTS (SELECT 1 FROM auteurs WHERE nom = 'Lulumineuse');

SET @auteur_id = (SELECT id FROM auteurs WHERE nom = 'Lulumineuse');

-- 2. Œuvre
INSERT INTO oeuvres (auteur_id, nom, abreviation)
SELECT @auteur_id, 'Telegram Lulumineuse', 'TgLulu'
WHERE NOT EXISTS (SELECT 1 FROM oeuvres WHERE nom = 'Telegram Lulumineuse');

SET @oeuvre_id = (SELECT id FROM oeuvres WHERE nom = 'Telegram Lulumineuse');

-- 3. État par défaut
SET @etat_id = (SELECT id FROM etats WHERE nom = 'À Corriger');

-- 4. Citations (6 segments des lots exportés)

-- Citation 1 — lot telegram_20260614_001, msg 6978
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Chers amis, chaque mois je diffuse un audio pour accompagner les donateurs du cercle des abonnés du site Lulumineuse.com (qui permettent la mise à disposition de nombreuses ressources au quotidien) à traverser les énergies et influences du mois/Moi et d''en extraire la sagesse et la profondeur.\nLa sécurité intérieure est une grande question que l''humanité devra résoudre par la migration de sa conscience, traversant des épreuves qui n''auront de cesse de l''inviter à sonder son propre monde intérieur.\nCet audio est à mon sens précieux à écouter et à saisir pour les temps actuels et ceux à venir très prochainement. (Il vous suffit de cliquer sur l''image pour l''écouter)',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Vie intérieure et transformation personnelle'),
  @etat_id,
  'Lulumineuse',
  '6978',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '6978');

-- Citation 2 — lot telegram_20260614_002, msg 6979
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Élan d''âme, café et prière : Lulumineuse.com doit rester complet.',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Foi et prière'),
  @etat_id,
  'Lulumineuse',
  '6979',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '6979');

-- Citation 3 — lot telegram_20260614_003, msg 7
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Message de test du 14/06/26, par Stéphane. Comment le lien vas-t-il être géré ? Comment le mot-clé vas-t-il être géré ?\n\nLiens: https://www.biovibralyon.fr/',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_id,
  'Lulumineuse',
  '7',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '7');

-- Citation 4 — lot telegram_20260614_004, msg 8
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Message N°2 du 14/06. Avec un lien. et un mot clé\n\nLiens: https://www.google.fr/',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Connaissance et vision du monde'),
  @etat_id,
  'Lulumineuse',
  '8',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '8');

-- Citation 5 — lot telegram_20260614_005, msg 9
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Test N°3 du 14/06 sans lien',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Connaissance de soi'),
  @etat_id,
  'Lulumineuse',
  '9',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '9');

-- Citation 6 — lot telegram_20260614_006, msg 10
INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom, telegram_message_id, date_entree)
SELECT
  'Dieu est juste. Suivons notre instinct.',
  @oeuvre_id,
  (SELECT id FROM themes WHERE nom = 'Ouverture à la lumière et à la présence divine'),
  @etat_id,
  'Lulumineuse',
  '10',
  '2026-06-14'
WHERE NOT EXISTS (SELECT 1 FROM citations WHERE telegram_message_id = '10');

-- 5. Mots-clés (insert ignore pour idempotence)
INSERT IGNORE INTO keywords (mot) VALUES
  ('Sécurité intérieure'), ('Épreuves'), ('Sagesse'),
  ('Conscience'), ('Migration spirituelle'), ('Ressources'), ('Audio guidé'),
  ('Spiritualité'), ('Café'), ('Prière'), ('Inspiration'), ('Bien-être'), ('Communauté'),
  ('Lien'), ('Test'), ('Gestion'), ('Biovibralyon'), ('Message'),
  ('Mot-clé'), ('Dieu'), ('Divin'),
  ('Seigneur'), ('Parole'), ('Révélation'), ('Enseignement spirituel'), ('Guidance'),
  ('Justice divine'), ('Intuition spirituelle'), ('Confiance intérieure');

-- 6. Liaisons citation ↔ mots-clés
-- Citation 1 (msg 6978)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '6978'
  AND k.mot IN ('Sécurité intérieure', 'Épreuves', 'Sagesse', 'Conscience', 'Migration spirituelle', 'Ressources', 'Audio guidé');

-- Citation 2 (msg 6979)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '6979'
  AND k.mot IN ('Spiritualité', 'Café', 'Prière', 'Inspiration', 'Bien-être', 'Communauté');

-- Citation 3 (msg 7)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '7'
  AND k.mot IN ('Lien', 'Test', 'Gestion', 'Biovibralyon', 'Message');

-- Citation 4 (msg 8)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '8'
  AND k.mot IN ('Mot-clé', 'Dieu', 'Message', 'Divin', 'Seigneur', 'Parole', 'Révélation', 'Enseignement spirituel', 'Guidance');

-- Citation 5 (msg 9)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '9'
  AND k.mot IN ('Lien');

-- Citation 6 (msg 10)
INSERT IGNORE INTO citation_keywords (citation_id, keyword_id)
SELECT c.id, k.id FROM citations c, keywords k
WHERE c.telegram_message_id = '10'
  AND k.mot IN ('Dieu', 'Justice divine', 'Intuition spirituelle', 'Confiance intérieure');

COMMIT;
```

- [ ] **Step 2: Exécuter le seed sur le serveur**

```bash
scp db/seeds/seed_citations_test.sql lumosphere:/tmp/
ssh lumosphere "cd /home2/mist2786/epuriel && php -r '\$c=require\"config/config.php\";echo \$c[\"db_user\"].\" \".\$c[\"db_name\"];'"
# Utiliser le user et db retournés :
ssh lumosphere "mysql -u mist2786_lumo_usr -p mist2786_lumosphere < /tmp/seed_citations_test.sql"
```

Note : le mot de passe sera demandé interactivement. Si besoin, passer par `php -r` pour exécuter le SQL via PDO.

- [ ] **Step 3: Vérifier les données**

```bash
ssh lumosphere "cd /home2/mist2786/epuriel && php -r '\$c=require\"config/config.php\";\$p=new PDO(\"mysql:host=\".\$c[\"db_host\"].\";dbname=\".\$c[\"db_name\"].\";charset=utf8mb4\",\$c[\"db_user\"],\$c[\"db_pass\"]);echo \"citations: \".\$p->query(\"SELECT COUNT(*) FROM citations\")->fetchColumn().PHP_EOL;echo \"keywords: \".\$p->query(\"SELECT COUNT(*) FROM keywords\")->fetchColumn().PHP_EOL;echo \"auteurs: \".\$p->query(\"SELECT COUNT(*) FROM auteurs\")->fetchColumn().PHP_EOL;echo \"oeuvres: \".\$p->query(\"SELECT COUNT(*) FROM oeuvres\")->fetchColumn().PHP_EOL;'"
```

Expected: citations: 6, keywords: ~29, auteurs: 1, oeuvres: 1

- [ ] **Step 4: Commit**

```bash
git add db/seeds/seed_citations_test.sql
git commit -m "feat(T08): seed SQL — 6 citations réelles depuis lots Telegram exportés"
```

---

### Task 5: .htaccess SPA + déploiement

**Files:**
- Modify: `public/.htaccess`

**Interfaces:**
- Consumes: `dist/` produit par `pnpm build`
- Produces: app déployée et accessible sur le serveur via le cookie dev

- [ ] **Step 1: Mettre à jour le .htaccess**

```apache
# Lumosphère — maintenance + SPA routing
RewriteEngine On

# Ressources statiques toujours accessibles
RewriteRule \.(css|js|jpg|jpeg|png|gif|svg|ico|woff2?)$ - [L]

# Page de maintenance elle-même
RewriteRule ^maintenance\.html$ - [L]

# Cookie dev présent → accès SPA
RewriteCond %{HTTP_COOKIE} lumosphere_dev=ouilulu
RewriteRule ^api/ - [L]
RewriteCond %{HTTP_COOKIE} lumosphere_dev=ouilulu
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ /index.html [L]

# Paramètre secret ?dev=ouilulu → pose le cookie (8 h) et redirige
RewriteCond %{QUERY_STRING} (?:^|&)dev=ouilulu(?:&|$)
RewriteRule ^(.*)$ /$1 [CO=lumosphere_dev:ouilulu:.%{HTTP_HOST}:480:/:Secure,NE,R=302,L]

# Tout autre visiteur → page de maintenance
RewriteRule ^ /maintenance.html [R=302,L]
```

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: `dist/` généré sans erreur

- [ ] **Step 3: Déployer**

```bash
rsync -avz --delete --exclude='api/' --exclude='config/' --exclude='lots/' dist/ lumosphere:/home2/mist2786/public_html/
```

- [ ] **Step 4: Vérifier le déploiement**

Ouvrir dans le navigateur : `https://lumosphere.mist2786.odns.fr/?dev=ouilulu`
Expected: la page d'accueil s'affiche avec le header, la sidebar, et les 6 citations du seed.

- [ ] **Step 5: Commit**

```bash
git add public/.htaccess
git commit -m "feat(T08): htaccess SPA routing + maintenance cookie dev"
```

---

### Task 6: Tests e2e Playwright

**Files:**
- Create: `e2e/navigation.spec.ts`
- Create: `e2e/theme.spec.ts`
- Create: `e2e/responsive.spec.ts`

**Interfaces:**
- Consumes: app servie par `pnpm dev` sur `localhost:5173`

Note : les tests e2e nécessitent que l'API soit accessible. En dev local, le proxy Vite redirige `/api` vers `localhost:8080`. Si l'API n'est pas disponible localement, les tests sur les citations réelles seront skippés. Les tests de navigation, thème et responsive fonctionnent sans API.

- [ ] **Step 1: Test de navigation**

```ts
// e2e/navigation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('la page accueil se charge', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header')).toContainText('Lumosphère')
  })

  test('le lien Connexion mène à /login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /connexion/i }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('Connexion')).toBeVisible()
  })

  test('la page 404 affiche un message et un lien retour', async ({ page }) => {
    await page.goto('/nimportequoi')
    await expect(page.getByText('Page introuvable')).toBeVisible()
    await page.getByRole('link', { name: /retour/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('la page admin affiche un placeholder', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('Administration')).toBeVisible()
  })

  test("le titre de l'onglet est Lumosphère", async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('Lumosphère')
  })

  test('le logo ramène à l accueil', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('link', { name: /lumosphère/i }).click()
    await expect(page).toHaveURL('/')
  })
})
```

- [ ] **Step 2: Test du thème**

```ts
// e2e/theme.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Thème clair/sombre/auto', () => {
  test('le bouton de thème cycle entre les 3 modes', async ({ page }) => {
    await page.goto('/')

    const btn = page.getByRole('button', { name: /passer en mode/i })
    await expect(btn).toBeVisible()

    // Défaut = auto → icône Sun → clic passe en light
    await btn.click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // light → clic → dark
    await btn.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // dark → clic → auto
    await btn.click()
  })

  test('le thème persiste après rechargement', async ({ page }) => {
    await page.goto('/')

    // Passer en dark : auto → light (1 clic) → dark (2 clics)
    const btn = page.getByRole('button', { name: /passer en mode/i })
    await btn.click()
    await btn.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
```

- [ ] **Step 3: Test responsive**

```ts
// e2e/responsive.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Responsive', () => {
  test('mobile: le burger est visible, la nav desktop cachée', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await expect(page.getByRole('button', { name: /ouvrir le menu/i })).toBeVisible()
    await expect(page.locator('header nav.hidden')).toBeHidden()
  })

  test('mobile: le burger ouvre le menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await page.getByRole('button', { name: /ouvrir le menu/i }).click()
    await expect(page.getByRole('link', { name: /connexion/i })).toBeVisible()
  })

  test('desktop: la sidebar est à côté du contenu', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })
})
```

- [ ] **Step 4: Exécuter les tests e2e**

Run: `pnpm test:e2e`
Expected: tous les tests PASS (sauf éventuellement ceux qui nécessitent l'API — à ajuster)

- [ ] **Step 5: Commit**

```bash
git add e2e/
git commit -m "test(T08): e2e Playwright — navigation, thème, responsive"
```

---

### Task 7: Quality gate finale

- [ ] **Step 1: Exécuter la quality gate complète**

```bash
pnpm lint && pnpm build && pnpm test && gitleaks detect -v
```

Expected: tout PASS, aucun secret détecté

- [ ] **Step 2: Exécuter les tests e2e**

Run: `pnpm test:e2e`
Expected: tout PASS

- [ ] **Step 3: Vérification visuelle**

Ouvrir l'app déployée dans le navigateur. Vérifier :
- [ ] Header : logo + "Lumosphère" + bascule thème + bouton connexion
- [ ] Sidebar : sections filtres (vides) visibles
- [ ] Zone contenu : 6 citations avec auteur, thème, mots-clés en badges
- [ ] Thème sombre : couleurs conformes à la charte
- [ ] Mobile (375px) : burger, sidebar empilée au-dessus
- [ ] 4 routes fonctionnelles (`/`, `/login`, `/admin`, `/xyz` → 404)
