import { test, expect } from '@playwright/test';

const runPatientFlow = process.env.E2E_PATIENT_FLOW === 'true';

test.describe('Patient create flow', () => {
  test.skip(!runPatientFlow, 'Set E2E_PATIENT_FLOW=true with live auth/API to run');

  test('patient registration wizard loads first step', async ({ page }) => {
    await page.goto('/patients/new');

    await expect(page.getByText('Personal')).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
  });
});
