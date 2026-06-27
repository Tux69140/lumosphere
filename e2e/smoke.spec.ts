import { test, expect } from '@playwright/test'

test('la page affiche le titre Lumosphère', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Lumosphère')).toBeVisible()
})
