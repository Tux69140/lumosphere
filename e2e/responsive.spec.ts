// e2e/responsive.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Responsive', () => {
  test('mobile: le burger est visible, la nav desktop cachée', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await expect(page.getByRole('button', { name: /ouvrir le menu/i })).toBeVisible()
    // La nav desktop est masquée par la classe "hidden" en mobile
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
