// e2e/navigation.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('la page accueil se charge', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header')).toContainText('Lumosphère')
  })

  test('le lien Connexion mène à /login', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('link', { name: /connexion/i })
      .first()
      .click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
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
    await page
      .getByRole('link', { name: /lumosphère/i })
      .first()
      .click()
    await expect(page).toHaveURL('/')
  })
})
