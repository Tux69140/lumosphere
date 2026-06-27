# T09 — Connexion + redirection : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à l'application un écran de connexion fonctionnel (avec « se souvenir de moi »), la déconnexion, la mémorisation de l'utilisateur connecté, la protection de la page admin et la redirection — sur la base du moteur d'auth serveur déjà livré en T07.

**Architecture:** Un contexte React `AuthProvider` (monté au-dessus de l'app, à l'intérieur du routeur) appelle `apiClient.getMe()` au démarrage et expose `useAuth()`. La page `/login` consomme `useAuth().login`. Une petite extension serveur ajoute la durée de session « 30 jours » quand « se souvenir de moi » est coché. Un composant `RequireAuth` protège `/admin`.

**Tech Stack:** React 19, React Router v7, TypeScript, Tailwind v4, Phosphor Icons, Zod, Sonner (toasts), Vitest, Playwright ; PHP 8.1, PDO, PHPUnit.

## Global Constraints

- **Dépend de T08** (squelette React déjà codé : `Header`, `MainLayout`, `AuthLayout`, `LoginPage` placeholder, `AccueilPage`, `AdminPage`, `NotFoundPage`, `useTheme`, routage). **À coder après T08.**
- **T07 est terminée et validée** — on n'y revient pas comme tâche, mais T09 ajoute une petite extension serveur (durée de session) livrée dans cette tâche.
- Rôles (constantes serveur) : Administrateur=1, Éditeur=2, Visiteur=3, Abo3=4, Abo4=5. Accès admin = rôles {1, 2}.
- Durées : **2 h d'inactivité** (case décochée), **30 jours** (case cochée). `REMEMBER_DURATION = 2592000`.
- Identifiants techniques en anglais ; libellés UI en **français accentué**.
- Icônes : **Phosphor uniquement**.
- `fetch` toujours avec `credentials: 'include'` (déjà géré par `apiClient`).
- Validation client avec **Zod** ; le serveur revalide toujours.
- React Router v7 : tout s'importe depuis `react-router` (`BrowserRouter`, `Routes`, `Route`, `Navigate`, `Link`, `useNavigate`, `MemoryRouter`, `Outlet`).
- Aucun secret en dur. `gitleaks` avant commit.
- Alias `@/*` → `src/*`.

---

### Task 1 : Extension serveur « se souvenir de moi »

**Files:**
- Modify: `api/dal/auth.php` (constante + fonction pure `dal_auth_is_session_expired`)
- Modify: `api/endpoints/auth.php` (`_auth_login` lit `remember` ; `_auth_init_session` stocke l'état + cookie persistant)
- Modify: `api/bootstrap.php` (contrôle d'expiration via la fonction pure + GC + rafraîchissement cookie)
- Modify: `.claude/rules/security.md` (note durée de session)
- Test: `tests/dal/SessionExpiryTest.php`

**Interfaces:**
- Produces: `dal_auth_is_session_expired(array $session, int $now): bool` ; constante `REMEMBER_DURATION = 2592000` ; `POST /auth/login` accepte `remember` (bool) dans le corps.

- [ ] **Step 1 : Écrire le test de la fonction d'expiration**

Créer `tests/dal/SessionExpiryTest.php` :

```php
<?php

declare(strict_types=1);

namespace Tests\Dal;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../api/dal/auth.php';

class SessionExpiryTest extends TestCase
{
    public function testNonRememberAliveWithinIdle(): void
    {
        $now = 1_000_000;
        $s = ['remember' => false, 'last_activity' => $now - 3600, 'login_at' => $now - 3600];
        $this->assertFalse(dal_auth_is_session_expired($s, $now));
    }

    public function testNonRememberExpiresAfterIdle(): void
    {
        $now = 1_000_000;
        $s = ['remember' => false, 'last_activity' => $now - (3 * 3600), 'login_at' => $now - (3 * 3600)];
        $this->assertTrue(dal_auth_is_session_expired($s, $now));
    }

    public function testRememberSurvivesLongIdle(): void
    {
        $now = 1_000_000;
        $s = ['remember' => true, 'last_activity' => $now - (10 * 3600), 'login_at' => $now - (10 * 3600)];
        $this->assertFalse(dal_auth_is_session_expired($s, $now));
    }

    public function testRememberExpiresAfter30Days(): void
    {
        $login = 1_000_000;
        $now = $login + (31 * 24 * 3600);
        $s = ['remember' => true, 'last_activity' => $now, 'login_at' => $login];
        $this->assertTrue(dal_auth_is_session_expired($s, $now));
    }
}
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `vendor/bin/phpunit tests/dal/SessionExpiryTest.php`
Expected: FAIL — `Error: Call to undefined function ... dal_auth_is_session_expired()`

- [ ] **Step 3 : Implémenter la constante et la fonction pure**

Dans `api/dal/auth.php`, après la ligne `const SESSION_PURGE_DAYS   = 90;` (vers la ligne 11), ajouter :

```php
const REMEMBER_DURATION = 2592000; // 30 jours (en secondes)

/**
 * Détermine si une session est expirée.
 * - remember : limite absolue de 30 jours depuis la connexion.
 * - sinon    : 2 h d'inactivité.
 */
function dal_auth_is_session_expired(array $session, int $now): bool
{
    if (!empty($session['remember'])) {
        $login_at = (int) ($session['login_at'] ?? 0);
        return ($now - $login_at) > REMEMBER_DURATION;
    }
    $last = (int) ($session['last_activity'] ?? 0);
    return ($now - $last) > SESSION_IDLE_TIMEOUT;
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `vendor/bin/phpunit tests/dal/SessionExpiryTest.php`
Expected: OK (4 tests, 4 assertions)

- [ ] **Step 5 : Brancher `remember` dans l'endpoint de connexion**

Dans `api/endpoints/auth.php`, modifier la signature et le corps de `_auth_init_session` :

```php
function _auth_init_session(PDO $pdo, int $user_id, int $role_id, bool $remember = false): void
{
    session_regenerate_id(true);
    $permissions = dal_auth_load_permissions($pdo, $role_id);
    $_SESSION['user_id']            = $user_id;
    $_SESSION['role_id']            = $role_id;
    $_SESSION['permissions']        = $permissions;
    $_SESSION['last_activity']      = time();
    $_SESSION['login_at']           = time();
    $_SESSION['remember']           = $remember;
    $_SESSION['session_token_hash'] = hash('sha256', session_id());
    dal_auth_create_session($pdo, $user_id, session_id());

    if ($remember) {
        setcookie(session_name(), session_id(), [
            'expires'  => time() + REMEMBER_DURATION,
            'path'     => '/',
            'secure'   => true,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}
```

Dans `_auth_login`, remplacer la ligne `_auth_init_session($pdo, (int) $user['id'], (int) $user['role_id']);` par :

```php
    $remember = !empty($body['remember']);
    _auth_init_session($pdo, (int) $user['id'], (int) $user['role_id'], $remember);
```

- [ ] **Step 6 : Adapter le contrôle d'expiration dans `bootstrap.php`**

Dans `api/bootstrap.php`, **avant** `session_start();` (après les `ini_set` de session, vers la ligne 8), ajouter :

```php
ini_set('session.gc_maxlifetime', '2592000'); // 30 jours : préserver les sessions « se souvenir de moi »
```

Puis remplacer la condition d'expiration (vers la ligne 59) :

```php
    if (time() - $_SESSION['last_activity'] > SESSION_IDLE_TIMEOUT) {
```

par :

```php
    if (dal_auth_is_session_expired($_SESSION, time())) {
```

Enfin, juste après le bloc de mise à jour de l'activité (après `dal_auth_update_last_seen(...)`, vers la ligne 86), ajouter :

```php
    // Rafraîchir le cookie persistant des sessions « se souvenir de moi »
    if (!empty($_SESSION['remember'])) {
        setcookie(session_name(), session_id(), [
            'expires'  => time() + REMEMBER_DURATION,
            'path'     => '/',
            'secure'   => true,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
```

- [ ] **Step 7 : Vérifier la syntaxe + relancer toute la suite DAL**

Run: `php -l api/endpoints/auth.php && php -l api/bootstrap.php && php -l api/dal/auth.php`
Expected: `No syntax errors detected` pour les trois.

Run: `vendor/bin/phpunit`
Expected: toute la suite verte (tests existants + 4 nouveaux). *(Nécessite la base de test locale `lumosphere_test`.)*

- [ ] **Step 8 : Noter la durée de session dans les règles de sécurité**

Dans `.claude/rules/security.md`, sous `## Authentication`, ajouter une puce :

```markdown
- Session lifetime: 2h idle by default; optional 30-day persistent session via "remember me" (`$_SESSION['remember']`, absolute 30-day cap).
```

- [ ] **Step 9 : Commit**

```bash
git add api/dal/auth.php api/endpoints/auth.php api/bootstrap.php tests/dal/SessionExpiryTest.php .claude/rules/security.md
git commit -m "feat(T09): session 30 jours via « se souvenir de moi » (extension serveur)"
```

---

### Task 2 : Fondation frontend — contexte d'auth, routeur, protection

Cette tâche regroupe les éléments interdépendants (sans eux, l'app ne compile pas) : client API étendu, contexte `useAuth`, `AuthProvider`, `RequireAuth`, montage du routeur dans `main.tsx`, et `App.tsx` qui devient `<Routes>`. À la fin, l'app compile et tourne (la page `/login` reste le placeholder T08, le bandeau reste celui de T08 — remplacés en Task 3 et Task 4).

**Files:**
- Modify: `src/services/api.ts` (signature `login`)
- Create: `src/hooks/useAuth.ts` (contexte + hook, sans JSX)
- Create: `src/components/AuthProvider.tsx` (fournisseur)
- Create: `src/components/RequireAuth.tsx` (garde de route)
- Modify: `src/main.tsx` (BrowserRouter + AuthProvider + Toaster)
- Modify: `src/App.tsx` (retirer `BrowserRouter`, protéger `/admin`)
- Modify: `src/setup-tests.ts` (stub `matchMedia` défensif)
- Modify: `src/__tests__/smoke.test.tsx` (envelopper avec AuthProvider)
- Test: `src/__tests__/useAuth.test.tsx`, `src/components/__tests__/RequireAuth.test.tsx`

**Interfaces:**
- Consumes: `apiClient.getMe()`, `apiClient.login()`, `apiClient.logout()`, `apiClient.onSessionExpired()`.
- Produces: `useAuth()` → `{ user: AuthUser | null, loading, login(email,password,remember), logout() }` ; type `AuthUser` ; composants `AuthProvider`, `RequireAuth`.

- [ ] **Step 1 : Étendre `apiClient.login`**

Dans `src/services/api.ts`, remplacer la méthode `login` :

```ts
  login: (email: string, password: string, remember: boolean) =>
    post<{
      id: number
      prenom: string
      nom: string
      email: string
      role_id: number
    }>('auth/login', { email, password, remember }),
```

- [ ] **Step 2 : Écrire le test du hook `useAuth`**

Créer `src/__tests__/useAuth.test.tsx` :

```tsx
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import { useAuth } from '@/hooks/useAuth'

vi.mock('@/services/api', () => ({
  apiClient: { getMe: vi.fn(), login: vi.fn(), logout: vi.fn(), onSessionExpired: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

import { apiClient } from '@/services/api'

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>{children}</AuthProvider>
  </MemoryRouter>
)

const ADMIN = { id: 1, prenom: 'A', nom: 'B', email: 'a@b.c', role_id: 1, role_nom: 'Administrateur' }

beforeEach(() => vi.clearAllMocks())

describe('useAuth', () => {
  it('charge null au montage sans session', async () => {
    vi.mocked(apiClient.getMe).mockResolvedValue({ status: 'ok', data: null, errors: [] })
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('login réussi remplit user et transmet remember', async () => {
    vi.mocked(apiClient.getMe).mockResolvedValueOnce({ status: 'ok', data: null, errors: [] })
    vi.mocked(apiClient.login).mockResolvedValue({ status: 'ok', data: { id: 1 }, errors: [] } as never)
    vi.mocked(apiClient.getMe).mockResolvedValueOnce({ status: 'ok', data: ADMIN, errors: [] } as never)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: { ok: boolean; error?: string } = { ok: false }
    await act(async () => {
      res = await result.current.login('a@b.c', 'pw', true)
    })
    expect(res.ok).toBe(true)
    expect(apiClient.login).toHaveBeenCalledWith('a@b.c', 'pw', true)
    expect(result.current.user?.role_nom).toBe('Administrateur')
  })

  it('login échoué renvoie une erreur sans connecter', async () => {
    vi.mocked(apiClient.getMe).mockResolvedValue({ status: 'ok', data: null, errors: [] })
    vi.mocked(apiClient.login).mockResolvedValue({
      status: 'error',
      data: null,
      errors: ['Identifiants incorrects.'],
    } as never)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: { ok: boolean; error?: string } = { ok: true }
    await act(async () => {
      res = await result.current.login('a@b.c', 'bad', false)
    })
    expect(res).toEqual({ ok: false, error: 'Identifiants incorrects.' })
    expect(result.current.user).toBeNull()
  })

  it('logout vide user', async () => {
    vi.mocked(apiClient.getMe).mockResolvedValue({ status: 'ok', data: ADMIN, errors: [] } as never)
    vi.mocked(apiClient.logout).mockResolvedValue({ status: 'ok', data: null, errors: [] } as never)
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.user).not.toBeNull())
    await act(async () => {
      await result.current.logout()
    })
    expect(result.current.user).toBeNull()
  })
})
```

- [ ] **Step 3 : Écrire le test de `RequireAuth`**

Créer `src/components/__tests__/RequireAuth.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router'
import { RequireAuth } from '../RequireAuth'
import { useAuth } from '@/hooks/useAuth'
import type { AuthUser } from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

function renderProtected(state: { user: AuthUser | null; loading: boolean }) {
  vi.mocked(useAuth).mockReturnValue({ ...state, login: vi.fn(), logout: vi.fn() })
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <div>ZONE_ADMIN</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>PAGE_LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

const admin: AuthUser = { id: 1, prenom: 'A', nom: 'B', email: 'a@b.c', role_id: 1, role_nom: 'Administrateur' }
const abo3: AuthUser = { id: 9, prenom: 'A', nom: 'B', email: 'a@b.c', role_id: 4, role_nom: 'Abo3' }

beforeEach(() => vi.clearAllMocks())

describe('RequireAuth', () => {
  it('chargement : ni zone ni redirection', () => {
    renderProtected({ user: null, loading: true })
    expect(screen.queryByText('ZONE_ADMIN')).not.toBeInTheDocument()
    expect(screen.queryByText('PAGE_LOGIN')).not.toBeInTheDocument()
  })

  it('non connecté : redirige vers /login', () => {
    renderProtected({ user: null, loading: false })
    expect(screen.getByText('PAGE_LOGIN')).toBeInTheDocument()
  })

  it('rôle non autorisé (abonné) : redirige vers /login', () => {
    renderProtected({ user: abo3, loading: false })
    expect(screen.getByText('PAGE_LOGIN')).toBeInTheDocument()
  })

  it('admin : affiche la zone protégée', () => {
    renderProtected({ user: admin, loading: false })
    expect(screen.getByText('ZONE_ADMIN')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4 : Lancer les tests, vérifier l'échec**

Run: `pnpm test -- src/__tests__/useAuth.test.tsx src/components/__tests__/RequireAuth.test.tsx`
Expected: FAIL — modules `@/components/AuthProvider`, `@/hooks/useAuth`, `../RequireAuth` introuvables.

- [ ] **Step 5 : Créer le contexte + hook (`useAuth.ts`)**

Créer `src/hooks/useAuth.ts` :

```ts
import { createContext, useContext } from 'react'

export type AuthUser = {
  id: number
  prenom: string
  nom: string
  email: string
  role_id: number
  role_nom: string
}

export type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string, remember: boolean) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>')
  }
  return ctx
}
```

- [ ] **Step 6 : Créer le fournisseur (`AuthProvider.tsx`)**

Créer `src/components/AuthProvider.tsx` :

```tsx
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { apiClient } from '@/services/api'
import { AuthContext, type AuthUser } from '@/hooks/useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    apiClient
      .getMe()
      .then((res) => {
        if (res.status === 'ok' && res.data) setUser(res.data as AuthUser)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    apiClient.onSessionExpired(() => {
      setUser(null)
      toast.error('Session expirée, reconnectez-vous.')
      navigate('/login')
    })
  }, [navigate])

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    try {
      const res = await apiClient.login(email, password, remember)
      if (res.status !== 'ok') {
        return { ok: false, error: res.errors?.[0] ?? 'Connexion impossible.' }
      }
      const me = await apiClient.getMe()
      if (me.status === 'ok' && me.data) setUser(me.data as AuthUser)
      return { ok: true }
    } catch {
      return { ok: false, error: 'Impossible de contacter le serveur.' }
    }
  }, [])

  const logout = useCallback(async () => {
    await apiClient.logout().catch(() => {})
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  )
}
```

- [ ] **Step 7 : Créer la garde de route (`RequireAuth.tsx`)**

Créer `src/components/RequireAuth.tsx` :

```tsx
import { type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'

const ALLOWED_ROLES = [1, 2] // Administrateur, Éditeur

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user || !ALLOWED_ROLES.includes(user.role_id)) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
```

- [ ] **Step 8 : `App.tsx` → `<Routes>` + protection `/admin`**

Remplacer le contenu de `src/App.tsx` :

```tsx
import { Routes, Route } from 'react-router'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AccueilPage } from '@/features/accueil/AccueilPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { NotFoundPage } from '@/features/NotFoundPage'
import { RequireAuth } from '@/components/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<AccueilPage />} />
        <Route
          path="admin"
          element={
            <RequireAuth>
              <AdminPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 9 : `main.tsx` → BrowserRouter + AuthProvider + Toaster**

Remplacer le contenu de `src/main.tsx` :

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { Toaster } from 'sonner'
import App from './App'
import { AuthProvider } from '@/components/AuthProvider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 10 : Stub `matchMedia` pour les tests de composants**

Dans `src/setup-tests.ts`, ajouter (s'il n'existe pas déjà depuis T08) :

```ts
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}
```

- [ ] **Step 11 : Mettre à jour le smoke test**

Remplacer le contenu de `src/__tests__/smoke.test.tsx` :

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { AuthProvider } from '@/components/AuthProvider'

vi.mock('@/services/api', () => ({
  apiClient: {
    getMe: vi.fn().mockResolvedValue({ status: 'ok', data: null, errors: [] }),
    login: vi.fn(),
    logout: vi.fn(),
    onSessionExpired: vi.fn(),
    findCitations: vi.fn().mockResolvedValue({ status: 'ok', data: { items: [], next_cursor: null }, errors: [] }),
  },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() }, Toaster: () => null }))

describe('Smoke', () => {
  it('affiche le bandeau avec Lumosphère', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('Lumosphère')).toBeInTheDocument())
  })
})
```

- [ ] **Step 12 : Vérifier compilation + tous les tests + build**

Run: `pnpm tsc --noEmit && pnpm test && pnpm build`
Expected: typecheck OK ; tous les tests verts (useTheme, useAuth, RequireAuth, smoke…) ; build OK.

- [ ] **Step 13 : Commit**

```bash
git add src/services/api.ts src/hooks/useAuth.ts src/components/AuthProvider.tsx src/components/RequireAuth.tsx src/main.tsx src/App.tsx src/setup-tests.ts src/__tests__/useAuth.test.tsx src/__tests__/smoke.test.tsx src/components/__tests__/RequireAuth.test.tsx
git commit -m "feat(T09): fondation auth — AuthProvider, useAuth, RequireAuth, routeur monté"
```

---

### Task 3 : Écran de connexion réel (`/login`)

**Files:**
- Modify: `src/features/auth/LoginPage.tsx` (remplace le placeholder T08)
- Test: `src/features/auth/__tests__/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 2).
- Produces: page `/login` — email + mot de passe (œil) + « se souvenir de moi » + soumission ; redirige vers `/` si déjà connecté ou après succès.

- [ ] **Step 1 : Écrire le test du formulaire**

Créer `src/features/auth/__tests__/LoginPage.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { LoginPage } from '../LoginPage'
import { useAuth } from '@/hooks/useAuth'

const navigate = vi.fn()
vi.mock('react-router', async (orig) => ({
  ...(await orig<typeof import('react-router')>()),
  useNavigate: () => navigate,
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))

function setup(login = vi.fn().mockResolvedValue({ ok: true })) {
  vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login, logout: vi.fn() })
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
  return { login }
}

beforeEach(() => vi.clearAllMocks())

describe('LoginPage', () => {
  it('affiche email, mot de passe, se souvenir de moi et le bouton', () => {
    setup()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/se souvenir de moi/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })

  it('soumet avec le drapeau « se souvenir de moi » et redirige', async () => {
    const { login } = setup()
    const u = userEvent.setup()
    await u.type(screen.getByLabelText(/email/i), 'a@b.c')
    await u.type(screen.getByLabelText(/mot de passe/i), 'secret')
    await u.click(screen.getByLabelText(/se souvenir de moi/i))
    await u.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(login).toHaveBeenCalledWith('a@b.c', 'secret', true)
    expect(navigate).toHaveBeenCalledWith('/')
  })

  it('affiche le message d’erreur du serveur', async () => {
    setup(vi.fn().mockResolvedValue({ ok: false, error: 'Identifiants incorrects.' }))
    const u = userEvent.setup()
    await u.type(screen.getByLabelText(/email/i), 'a@b.c')
    await u.type(screen.getByLabelText(/mot de passe/i), 'bad')
    await u.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(await screen.findByText('Identifiants incorrects.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `pnpm test -- src/features/auth/__tests__/LoginPage.test.tsx`
Expected: FAIL (le placeholder n'a ni champs ni bouton « Se connecter »).

- [ ] **Step 3 : Implémenter `LoginPage`**

Remplacer le contenu de `src/features/auth/LoginPage.tsx` :

```tsx
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide.'),
  password: z.string().min(1, 'Mot de passe requis.'),
})

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Saisie invalide.')
      return
    }
    setSubmitting(true)
    const res = await login(email, password, remember)
    setSubmitting(false)
    if (res.ok) navigate('/')
    else setError(res.error ?? 'Connexion impossible.')
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-bg-card) p-6">
      <h1 className="mb-4 text-xl font-bold text-(--color-text-primary)">Connexion</h1>

      {error && (
        <div className="mb-4 rounded-md bg-(--color-danger-bg) p-3 text-sm text-(--color-danger-text)">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm text-(--color-text-secondary)">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 text-sm text-(--color-text-primary)"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm text-(--color-text-secondary)">
            Mot de passe
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-(--color-border) bg-(--color-bg-field) px-3 py-2 pr-10 text-sm text-(--color-text-primary)"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-(--color-text-placeholder)"
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-(--color-text-secondary)">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Se souvenir de moi
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-(--color-action) px-4 py-2 text-sm font-medium text-(--color-action-text) hover:bg-(--color-action-hover) disabled:opacity-60"
        >
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run: `pnpm test -- src/features/auth/__tests__/LoginPage.test.tsx`
Expected: 3 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/features/auth/LoginPage.tsx src/features/auth/__tests__/LoginPage.test.tsx
git commit -m "feat(T09): écran de connexion (email, mot de passe, se souvenir de moi)"
```

---

### Task 4 : Bandeau réactif à l'authentification

**Files:**
- Modify: `src/components/Header.tsx`
- Test: `src/components/__tests__/Header.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 2), `ThemeToggle` (T08).
- Produces: bandeau affichant Connexion / Déconnexion / lien Admin selon l'état et le rôle.

- [ ] **Step 1 : Écrire le test du bandeau**

Créer `src/components/__tests__/Header.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import { Header } from '../Header'
import { useAuth } from '@/hooks/useAuth'
import type { AuthUser } from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../ThemeToggle', () => ({ ThemeToggle: () => null }))

function renderHeader(user: AuthUser | null) {
  vi.mocked(useAuth).mockReturnValue({ user, loading: false, login: vi.fn(), logout: vi.fn() })
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  )
}

const editeur: AuthUser = { id: 2, prenom: 'E', nom: 'D', email: 'e@d.c', role_id: 2, role_nom: 'Éditeur' }
const abo3: AuthUser = { id: 9, prenom: 'A', nom: 'B', email: 'a@b.c', role_id: 4, role_nom: 'Abo3' }

beforeEach(() => vi.clearAllMocks())

describe('Header', () => {
  it('non connecté : Connexion visible, pas Déconnexion', () => {
    renderHeader(null)
    expect(screen.getByRole('link', { name: /connexion/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /déconnexion/i })).not.toBeInTheDocument()
  })

  it('éditeur : Déconnexion + lien Admin', () => {
    renderHeader(editeur)
    expect(screen.getByRole('button', { name: /déconnexion/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument()
  })

  it('abonné : Déconnexion mais pas de lien Admin', () => {
    renderHeader(abo3)
    expect(screen.getByRole('button', { name: /déconnexion/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

Run: `pnpm test -- src/components/__tests__/Header.test.tsx`
Expected: FAIL (le Header T08 affiche toujours « Connexion », ignore l'auth).

- [ ] **Step 3 : Réécrire `Header.tsx`**

Remplacer le contenu de `src/components/Header.tsx` :

```tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { SunHorizon, List, X, SignIn, SignOut } from '@phosphor-icons/react'
import { ThemeToggle } from './ThemeToggle'
import { useAuth } from '@/hooks/useAuth'

const ADMIN_ROLES = [1, 2] // Administrateur, Éditeur

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isStaff = user !== null && ADMIN_ROLES.includes(user.role_id)

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/')
  }

  function renderActions() {
    return (
      <>
        <ThemeToggle />
        {isStaff && (
          <Link
            to="/admin"
            onClick={() => setMenuOpen(false)}
            className="rounded-md px-3 py-2 text-sm text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors"
          >
            Admin
          </Link>
        )}
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors"
          >
            <SignOut size={18} />
            <span>Déconnexion</span>
          </button>
        ) : (
          <Link
            to="/login"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-(--color-link-header) hover:bg-(--color-bg-button) transition-colors"
          >
            <SignIn size={18} />
            <span>Connexion</span>
          </Link>
        )}
      </>
    )
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-(--color-border-header) bg-(--color-bg-header) px-4 py-3">
      <Link to="/" className="flex items-center gap-2 no-underline">
        <SunHorizon size={28} weight="fill" className="text-(--color-accent)" />
        <span className="text-lg font-bold text-(--color-text-header)">Lumosphère</span>
      </Link>

      <nav className="hidden items-center gap-2 md:flex">{renderActions()}</nav>

      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="rounded-md p-2 text-(--color-icon-header) md:hidden"
        aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        {menuOpen ? <X size={24} /> : <List size={24} />}
      </button>

      {menuOpen && (
        <div className="absolute left-0 right-0 top-full border-b border-(--color-border-header) bg-(--color-bg-header) p-4 md:hidden">
          <div className="flex flex-col gap-3">{renderActions()}</div>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 4 : Lancer le test + le smoke test (non-régression)**

Run: `pnpm test -- src/components/__tests__/Header.test.tsx src/__tests__/smoke.test.tsx`
Expected: tous PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/components/Header.tsx src/components/__tests__/Header.test.tsx
git commit -m "feat(T09): bandeau réactif — connexion/déconnexion + lien Admin selon le rôle"
```

---

### Task 5 : Tests e2e Playwright

**Files:**
- Create: `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: l'app servie sur `localhost:5173` + l'API joignable + un compte admin réel.

> **Préalable** : les parcours « connexion réussie / déconnexion » nécessitent l'API PHP joignable et un compte admin. Identifiants via `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (jamais en dur) ; sinon ces deux tests se mettent en `skip`. Les parcours « formulaire » / « redirection /admin » / « mauvais identifiants » tournent sans compte (le dernier suppose l'API joignable pour renvoyer le message ; sinon l'adapter ou le skip).

- [ ] **Step 1 : Écrire les parcours**

Créer `e2e/auth.spec.ts` :

```ts
import { test, expect } from '@playwright/test'

const EMAIL = process.env.E2E_ADMIN_EMAIL ?? ''
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''

test.describe('Authentification', () => {
  test('le formulaire de connexion est complet', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/mot de passe/i)).toBeVisible()
    await expect(page.getByLabel(/se souvenir de moi/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible()
  })

  test('/admin sans connexion → redirigé vers /login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('connexion réussie → accueil + Déconnexion', async ({ page }) => {
    test.skip(EMAIL === '' || PASSWORD === '', 'E2E_ADMIN_EMAIL/PASSWORD non fournis')
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/mot de passe/i).fill(PASSWORD)
    await page.getByRole('button', { name: /se connecter/i }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('button', { name: /déconnexion/i })).toBeVisible()
  })

  test('déconnexion → Connexion réapparaît', async ({ page }) => {
    test.skip(EMAIL === '' || PASSWORD === '', 'E2E_ADMIN_EMAIL/PASSWORD non fournis')
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/mot de passe/i).fill(PASSWORD)
    await page.getByRole('button', { name: /se connecter/i }).click()
    await page.getByRole('button', { name: /déconnexion/i }).click()
    await expect(page.getByRole('link', { name: /connexion/i })).toBeVisible()
  })
})
```

- [ ] **Step 2 : Exécuter**

Run: `pnpm test:e2e -- e2e/auth.spec.ts`
Expected: parcours formulaire + redirection /admin PASS ; parcours connexion/déconnexion PASS si identifiants fournis + API joignable, sinon SKIP.

- [ ] **Step 3 : Commit**

```bash
git add e2e/auth.spec.ts
git commit -m "test(T09): e2e Playwright — connexion, redirection /admin, déconnexion"
```

---

### Task 6 : Quality gate, déploiement, vérification réelle

**Files:** aucun fichier de code nouveau.

- [ ] **Step 1 : Quality gate complète**

Run: `pnpm lint && pnpm build && pnpm test && vendor/bin/phpunit && gitleaks detect -v`
Expected: tout PASS, aucun secret détecté.

- [ ] **Step 2 : Vérifier la config serveur**

Run: `ssh lumosphere "test -f /home2/mist2786/public_html/config/config.php && echo OK || echo MANQUANT"`
Expected: `OK`. Si `MANQUANT`, signaler au chef de projet avant de continuer (l'API ne tournera pas en ligne).

- [ ] **Step 3 : Déployer le frontend ET les fichiers API modifiés**

```bash
pnpm build
rsync -avz --delete --exclude='api/' --exclude='config/' dist/ lumosphere:/home2/mist2786/public_html/
rsync -avz api/ lumosphere:/home2/mist2786/public_html/api/
```

- [ ] **Step 4 : Vérification manuelle sur le site déployé**

Ouvrir `https://<domaine>/?dev=ouilulu`, puis vérifier :
- [ ] Accueil accessible sans connexion (corpus vide pour un visiteur — normal).
- [ ] `/admin` sans connexion → redirigé vers `/login`.
- [ ] Connexion avec le compte admin → accueil, **les 6 citations de test visibles**, bandeau « Déconnexion » + « Admin ».
- [ ] Recharger la page → toujours connecté.
- [ ] « Se souvenir de moi » coché → fermer/rouvrir le navigateur → toujours connecté. Décoché → déconnecté à la réouverture.
- [ ] Déconnexion → retour accueil, bandeau « Connexion ».
- [ ] Cookie de session : drapeaux `HttpOnly` + `Secure` présents (outils du navigateur).

- [ ] **Step 5 : Commit éventuel**

Aucun fichier de code dans cette tâche. En cas d'ajustement nécessaire, committer avec `fix(T09): …`.
