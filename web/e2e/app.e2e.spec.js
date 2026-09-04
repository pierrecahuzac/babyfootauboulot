import { test, expect } from '@playwright/test';

test.describe('Babyfoot E2E', () => {
  test('accueil affiche titre et navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('BABYFOOT')).toBeVisible();
    await expect(page.getByText('Prêt à jouer')).toBeVisible();
    await expect(page.getByText('Joueurs inscrits')).toBeVisible();
    await expect(page.getByText('pierre_j').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigation inscription', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /S'inscrire/ }).click();
    await expect(page.getByText('Rejoins la partie')).toBeVisible();
    await expect(page.getByPlaceholder('ex. pierre_j')).toBeVisible();
  });

  test('tirage aléatoire 1v1 remplit les équipes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Créer un match/ }).click();
    await expect(page.getByText('Nouveau match')).toBeVisible();
    await page.getByRole('button', { name: /Tirage aléatoire/ }).click();
    const selects = page.locator('select');
    await expect(selects.first()).not.toHaveValue('', { timeout: 2000 });
    await expect(selects.nth(1)).not.toHaveValue('');
    const v1 = await selects.first().inputValue();
    const v2 = await selects.nth(1).inputValue();
    expect(v1).not.toBe(v2);
  });

  test('2v2 affiche 4 selects', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Créer un match/ }).click();
    await page.getByRole('button', { name: /2 vs 2/ }).click();
    await expect(page.locator('select')).toHaveCount(4);
    await page.getByRole('button', { name: /Tirage aléatoire/ }).click();
    // avec 3 joueurs seed, on doit voir erreur
    await expect(page.getByText(/Pas assez de joueurs/)).toBeVisible({ timeout: 2000 });
  });

  test('stats affiche classement', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /🏆 Stats/ }).click();
    await expect(page.getByText('Classement')).toBeVisible();
    await expect(page.getByText('pierre_j').first()).toBeVisible({ timeout: 3000 });
  });
});
