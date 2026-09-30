import { expect, test } from '../fixtures/test';
import { newUser, signUp } from '../support/api';

test('the owner invites by link, the invitee joins and is removed again', async ({
    page,
    household,
    browser,
    baseURL,
}) => {
    await page.goto('/settings');
    await page.getByRole('link', { name: 'Members' }).click();
    await expect(page).toHaveURL(/\/settings\/members$/);

    await page.getByLabel('Note (optional)').fill('For the invitee');
    await page.getByRole('button', { name: 'Create invitation link' }).click();
    const link = await page.getByTestId('invitation-link').innerText();
    expect(link).toContain('/invite/');
    await expect(page.getByText('For the invitee')).toBeVisible();

    // The invitee is another person in another browser.
    const guestContext = await browser.newContext({ baseURL });
    const guest = await guestContext.newPage();
    const invitee = newUser();
    await signUp(guest.request, invitee);

    await guest.goto(link);
    await guest.getByRole('button', { name: 'Join household' }).click();
    await expect(
        guest.getByRole('heading', { name: `Household ${household}` }),
    ).toBeVisible();

    // Used up: the link is gone from the open list and lets nobody else in.
    await page.reload();
    await expect(page.getByText(invitee.email)).toBeVisible();
    await expect(page.getByText('No open invitations.')).toBeVisible();
    await guest.goto(link);
    await expect(
        guest.getByText('This invitation is no longer valid.'),
    ).toBeVisible();

    await guest.goto('/');
    await expect(
        guest.getByRole('heading', { name: `Household ${household}` }),
    ).toBeVisible();

    await page.getByRole('button', { name: `Remove ${invitee.name}` }).click();
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(page.getByText(invitee.email)).toBeHidden();

    // Still inside the app: the next request is refused, and with no household left onboarding follows.
    await guest.getByRole('link', { name: 'Transactions' }).click();
    await expect(guest).toHaveURL(/\/onboarding$/);

    await guestContext.close();
});

test('a user creates a second household and switches between them', async ({
    page,
    household,
}) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'New household' }).click();
    await expect(page).toHaveURL(/\/onboarding\?new=1$/);

    await page.getByLabel('Household name').fill('Second home');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('Description').fill('Second account');
    await page.getByLabel('Initial value').fill('50');
    await page.getByRole('button', { name: 'Add account' }).click();

    // The new household is the active one.
    await expect(
        page.getByRole('heading', { name: 'Household Second home' }),
    ).toBeVisible();

    await page.goto('/settings');
    await page.getByRole('button', { name: household }).click();
    await expect(
        page.getByText(`Now in household “${household}”`),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: `Household ${household}` }),
    ).toBeVisible();

    // The choice survives a reload.
    await page.reload();
    await expect(
        page.getByRole('heading', { name: `Household ${household}` }),
    ).toBeVisible();
});
