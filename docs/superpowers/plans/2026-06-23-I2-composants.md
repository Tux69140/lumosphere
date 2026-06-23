# Phase I.2 — Installation des composants

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installer et configurer tous les composants frontend et l'outillage PHP nécessaires pour démarrer le développement de Lumosphère (Phases I à II).

**Architecture:** Le frontend React/Vite cohabite avec le backend PHP existant dans le même dépôt. Le code source React vit dans `src/`, le build produit `dist/`. Le backend PHP (`api/`, `db/`) reste inchangé. pnpm gère les dépendances front, Composer gère les dépendances PHP.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS, Radix UI, cmdk, react-day-picker, Sonner, TanStack Table, Phosphor Icons, Zod, ESLint, Prettier, Vitest, Playwright, PHPStan, PHPCS.

## Global Constraints

- **Pas de code Electron/Tauri** — application web pure (PWA future).
- **pnpm** comme gestionnaire de paquets (pas npm ni yarn).
- **Identifiants techniques en anglais**, labels UI en français.
- **Aucun secret en dur** dans le code source.
- **Ne pas modifier** les fichiers existants `api/`, `db/`, `vendor/` sauf `composer.json`.
- **Installer en commandes groupées** — jamais paquet par paquet.
- **Mettre à jour la documentation** après chaque changement d'état du projet.

---

### Task 1: Initialisation du projet React/Vite/TypeScript + toutes les dépendances

**Files:**

- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/vite-env.d.ts`
- Create: `index.html`

**Produces:**

- Projet Vite fonctionnel : `pnpm build` passe, `pnpm dev` lance le serveur de développement.
- Toutes les dépendances npm installées et importables.

- [ ] **Step 1: Créer `package.json`**

```json
{
  "name": "lumosphere",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "pnpm@10.33.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint . && prettier --check .",
    "lint:fix": "eslint --fix . && prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "tsc": "tsc"
  }
}
```

- [ ] **Step 2: Installer toutes les dépendances en deux commandes groupées**

Dépendances de production :

```bash
pnpm add react@^19 react-dom@^19 @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-switch @radix-ui/react-label @radix-ui/react-separator @radix-ui/react-slot cmdk react-day-picker sonner @tanstack/react-table @phosphor-icons/react zod
```

Dépendances de développement :

```bash
pnpm add -D typescript@~5.8 @types/react @types/react-dom @vitejs/plugin-react vite tailwindcss @tailwindcss/vite eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh prettier eslint-config-prettier vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test
```

- [ ] **Step 3: Créer `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 4: Créer `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "vite-env.d.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Créer `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Créer `index.html` à la racine**

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lumosphère</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Créer `src/vite-env.d.ts`**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 8: Créer `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 9: Créer `src/index.css`**

```css
@import 'tailwindcss';
```

- [ ] **Step 10: Créer `src/App.tsx`**

```tsx
export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <h1 className="text-3xl font-bold text-orange-600">Lumosphère</h1>
    </div>
  )
}
```

- [ ] **Step 11: Vérifier que le build passe**

Run: `pnpm build`
Expected: BUILD réussi, fichiers générés dans `dist/`.

- [ ] **Step 12: Vérifier que le serveur de dev fonctionne**

Run: `pnpm dev`
Expected: serveur démarré, page affiche « Lumosphère » en orange sur fond clair.

- [ ] **Step 13: Mettre à jour `.gitignore`**

Ajouter `dist/` et `node_modules/` s'ils ne sont pas déjà présents (vérifier avant d'ajouter).

- [ ] **Step 14: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts tsconfig.json tsconfig.node.json index.html src/ .gitignore
git commit -m "feat(I.2): initialisation React 19 + Vite + TypeScript + toutes les dépendances UI"
```

---

### Task 2: Configuration Tailwind CSS + ESLint + Prettier

**Files:**

- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `.prettierignore`
- Modify: `src/App.tsx` (vérification Tailwind)

**Consumes:** Projet Vite fonctionnel (Task 1).
**Produces:** `pnpm lint` passe sans erreur.

- [ ] **Step 1: Créer `eslint.config.js`**

```javascript
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'vendor', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  prettier,
)
```

- [ ] **Step 2: Créer `.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 3: Créer `.prettierignore`**

```
dist
vendor
node_modules
pnpm-lock.yaml
```

- [ ] **Step 4: Lancer le formatage sur le code existant**

Run: `pnpm lint:fix`
Expected: fichiers reformatés, aucune erreur restante.

- [ ] **Step 5: Vérifier que `pnpm lint` passe**

Run: `pnpm lint`
Expected: 0 erreurs, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js .prettierrc .prettierignore src/
git commit -m "chore(I.2): configuration ESLint + Prettier"
```

---

### Task 3: Configuration Vitest + test de vérification

**Files:**

- Create: `vitest.config.ts`
- Create: `src/setup-tests.ts`
- Create: `src/__tests__/smoke.test.tsx`

**Consumes:** Projet Vite fonctionnel (Task 1), lint configuré (Task 2).
**Produces:** `pnpm test` passe avec un test de vérification.

- [ ] **Step 1: Créer `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setup-tests.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

- [ ] **Step 2: Créer `src/setup-tests.ts`**

```typescript
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Écrire le test de vérification `src/__tests__/smoke.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App', () => {
  it('affiche le titre Lumosphère', () => {
    render(<App />)
    expect(screen.getByText('Lumosphère')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `pnpm test`
Expected: 1 test passé, 0 échoué.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts src/setup-tests.ts src/__tests__/
git commit -m "test(I.2): configuration Vitest + test de vérification"
```

---

### Task 4: Configuration Playwright

**Files:**

- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`

**Consumes:** Projet Vite fonctionnel (Task 1).
**Produces:** `pnpm test:e2e` passe avec un test de bout en bout.

- [ ] **Step 1: Installer les navigateurs Playwright**

```bash
pnpm exec playwright install --with-deps chromium
```

On installe uniquement Chromium pour le développement local (plus rapide). Les autres navigateurs seront ajoutés en CI si nécessaire.

- [ ] **Step 2: Créer `playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
```

- [ ] **Step 3: Écrire le test e2e `e2e/smoke.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test('la page affiche le titre Lumosphère', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Lumosphère')).toBeVisible()
})
```

- [ ] **Step 4: Vérifier que le test e2e passe**

Run: `pnpm test:e2e`
Expected: 1 test passé. Le serveur Vite démarre automatiquement, le navigateur invisible charge la page, vérifie le titre.

- [ ] **Step 5: Ajouter les artefacts Playwright au `.gitignore`**

Ajouter :

```
playwright-report/
test-results/
```

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e/ .gitignore
git commit -m "test(I.2): configuration Playwright + test e2e de vérification"
```

---

### Task 5: Outillage PHP (PHPStan + PHPCS) + vérification finale

**Files:**

- Modify: `composer.json`
- Create: `phpstan.neon`
- Create: `phpcs.xml`
- Modify: `docs/note_composants-I2.md` (mise à jour statut)

**Consumes:** Backend PHP existant (`api/dal/`).
**Produces:** `phpstan analyse` et `phpcs` passent. Note d'inventaire mise à jour.

- [ ] **Step 1: Installer PHPStan et PHPCS via Composer**

```bash
composer require --dev phpstan/phpstan squizlabs/php_codesniffer
```

- [ ] **Step 2: Créer `phpstan.neon`**

```neon
parameters:
    level: 5
    paths:
        - api
```

- [ ] **Step 3: Créer `phpcs.xml`**

```xml
<?xml version="1.0"?>
<ruleset name="Lumosphere">
    <description>Lumosphère PHP coding standard</description>
    <file>api</file>
    <arg name="extensions" value="php"/>
    <arg name="colors"/>
    <arg value="sp"/>
    <rule ref="PSR12"/>
</ruleset>
```

- [ ] **Step 4: Vérifier PHPStan**

Run: `./vendor/bin/phpstan analyse`
Expected: analyse terminée. Des erreurs potentielles sont attendues sur le code existant — les noter sans les corriger (hors périmètre I.2).

- [ ] **Step 5: Vérifier PHPCS**

Run: `./vendor/bin/phpcs`
Expected: analyse terminée. Des écarts de style sont attendus — les noter sans les corriger (hors périmètre I.2).

- [ ] **Step 6: Vérification finale — tous les outils passent**

Exécuter la suite complète :

```bash
pnpm build && pnpm lint && pnpm test && pnpm test:e2e && ./vendor/bin/phpstan analyse && ./vendor/bin/phpcs && gitleaks detect -v
```

Expected: tout passe (sauf éventuelles erreurs PHPStan/PHPCS sur le code PHP existant, qui seront traitées en I.4).

- [ ] **Step 7: Mettre à jour `docs/note_composants-I2.md`**

Déplacer les éléments de « Absent — à installer maintenant » vers « Présent dans le dépôt » avec les versions installées.

- [ ] **Step 8: Commit**

```bash
git add composer.json composer.lock phpstan.neon phpcs.xml vendor/ docs/note_composants-I2.md
git commit -m "chore(I.2): ajout PHPStan + PHPCS + mise à jour note composants"
```

---

## Vérification post-plan

À la fin de toutes les tasks, la quality gate suivante doit passer :

| Commande                       | Résultat attendu        |
| ------------------------------ | ----------------------- |
| `pnpm build`                   | Build réussi            |
| `pnpm lint`                    | 0 erreur                |
| `pnpm test`                    | Tests unitaires passent |
| `pnpm test:e2e`                | Tests e2e passent       |
| `pnpm tsc --noEmit`            | 0 erreur TypeScript     |
| `./vendor/bin/phpstan analyse` | Analyse terminée        |
| `./vendor/bin/phpcs`           | Analyse terminée        |
| `gitleaks detect -v`           | Aucun secret détecté    |

Une fois validé, cocher les cases I.2 dans le devbook de développement (`docs/3-devbook_developpement-lumosphere.md`).
