import { expect, test } from '../fixtures/test';
import { newUser, signUp } from '../support/api';
import { lastMailLink } from '../support/mail';

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
        await page.getByRole('button', { name: 'Login', exact: true }).click();
        await expect(page.getByRole('alert')).toHaveText(
            'Invalid email or password',
        );
        await expect(page).toHaveURL(/\/login$/);
    });

    test('signs in the demo user with one click and lands on onboarding', async ({
        page,
    }) => {
        await page.goto('/login');
        await page
            .getByRole('button', { name: 'Log in as demo (empty household)' })
            .click();
        // The seeded demo user never has a household.
        await expect(page).toHaveURL(/\/onboarding$/);
        await expect(
            page.getByRole('heading', { name: 'Welcome' }),
        ).toBeVisible();
    });
});

test('a visitor signs up, confirms the email and reaches onboarding', async ({
    page,
}) => {
    const user = newUser();
    await page.goto('/login');
    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(
        page.getByRole('heading', { name: 'Create account' }),
    ).toBeVisible();

    await page.getByLabel('Name').fill(user.name);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByLabel('Confirm password').fill(user.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(
        page.getByRole('heading', { name: 'Check your email' }),
    ).toBeVisible();
    await expect(page.getByText(user.email)).toBeVisible();

    await page.goto(lastMailLink(user.email));
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
});

test('a user resets a forgotten password and logs in with the new one', async ({
    page,
    request,
}) => {
    // Separate request context: the account exists, but the page stays signed out.
    const user = newUser();
    await signUp(request, user);
    const newPassword = 'changed-password';

    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(
        page.getByRole('heading', { name: 'Forgot password' }),
    ).toBeVisible();
    await page.getByLabel('Email').fill(user.email);
    await page.getByRole('button', { name: 'Send link' }).click();
    await expect(page.getByRole('status')).toContainText(user.email);

    await page.goto(lastMailLink(user.email));
    await expect(
        page.getByRole('heading', { name: 'Choose a new password' }),
    ).toBeVisible();
    await page.getByLabel('New password').fill(newPassword);
    await page.getByLabel('Confirm password').fill(newPassword);
    await page.getByRole('button', { name: 'Save password' }).click();

    await expect(page).toHaveURL(/\/login\?reset=done$/);
    await expect(page.getByRole('status')).toHaveText(
        'Your password has been changed. Log in with the new one.',
    );
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Enter password').fill(newPassword);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
});
