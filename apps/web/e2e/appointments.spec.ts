import { test, expect } from '@playwright/test';

test.describe('Appointments', () => {
  test('appointments page renders (auth may redirect)', async ({ page }) => {
    await page.goto('/appointments');

    const appointmentsHeading = page.getByRole('heading', { name: 'Appointments' });
    const loginHeading = page.getByRole('heading', { name: /welcome back/i });

    await expect(appointmentsHeading.or(loginHeading)).toBeVisible({ timeout: 15_000 });
  });
});
