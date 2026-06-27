// e2e/theme.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Thème clair/sombre/auto', () => {
  test('le bouton de thème cycle entre les 3 modes', async ({ page }) => {
    await page.goto('/')

    // Le bouton de thème a un aria-label qui commence par "Passer en mode"
    const btn = page.getByRole('button', { name: /passer en mode/i }).first()
    await expect(btn).toBeVisible()

    // Défaut = auto → clic passe en light (pas de classe dark)
    await btn.click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // light → clic → dark
    await btn.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    // dark → clic → auto (retour initial)
    await btn.click()
  })

  test('le thème persiste après rechargement', async ({ page }) => {
    await page.goto('/')

    // Passer en dark : auto → light (1 clic) → dark (2 clics)
    const btn = page.getByRole('button', { name: /passer en mode/i }).first()
    await btn.click()
    await btn.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
