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
