import { expect, test } from '../fixtures/test';

test('a new user sets up a household and reaches home', async ({
    page,
    user,
}) => {
    const householdName = `${user.name} home`;
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.getByLabel('Household name').fill(householdName);
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Next' }).click();

    await page.getByLabel('Description').fill('Main account');
    await page.getByLabel('Initial value').fill('1000');
    await page.getByRole('button', { name: 'Add account' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(
        page.getByRole('heading', { name: `Household ${householdName}` }),
    ).toBeVisible();
});
