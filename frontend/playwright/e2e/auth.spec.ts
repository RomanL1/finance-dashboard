import { expect, test } from '../fixtures/test';

test.describe('login', () => {
    test('redirects anonymous visitors to the login page', async ({ page }) => {
        await page.goto('/transactions');
        await expect(page).toHaveURL(/\/login$/);
        await expect(
            page.getByRole('heading', { name: 'Login' }),
        ).toBeVisible();
    });

    test('rejects a wrong password', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('demo@finance.local');
        await page.getByLabel('Enter password').fill('wrong-password');
        await page.getByRole('button', { name: 'Login' }).click();
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
    });

    test('signs in the demo user and lands on onboarding', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('demo@finance.local');
        await page.getByLabel('Enter password').fill('demo-password');
        await page.getByRole('button', { name: 'Login' }).click();
        // The seeded demo user never has a household.
        await expect(page).toHaveURL(/\/onboarding$/);
        await expect(
            page.getByRole('heading', { name: 'Welcome' }),
        ).toBeVisible();
    });
});
