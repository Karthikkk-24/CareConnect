import { test, expect } from '@playwright/test';

test.describe('Public pages smoke', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('docs page loads', async ({ page }) => {
    await page.goto('/docs');
    await expect(page.getByRole('heading', { name: 'Documentation' })).toBeVisible();
    await expect(page.getByText(/open-source hospital management platform/i)).toBeVisible();
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: 'Terms of Use' })).toBeVisible();
  });
});
