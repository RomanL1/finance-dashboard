import { expect, test } from '../fixtures/test';
import {
    accountChip,
    rowAction,
    selectOption,
    totalBalance,
} from '../support/ui';

/** M7: create an account with type and initial value, rename it, see it on home. */
test('creates and renames an account', async ({
    page,
    household: _household,
}) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Add account' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Description').fill('Savings jar');
    await selectOption(page, dialog.getByLabel('Account type'), 'Savings');
    await dialog.getByLabel('Initial value').fill('250');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole('listitem').filter({ hasText: 'Savings jar' });
    await expect(row).toBeVisible();
    await rowAction(page, row, 'Account actions', 'Edit');
    await dialog.getByLabel('Description').fill('Holiday fund');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expect(
        page.getByRole('listitem').filter({ hasText: 'Holiday fund' }),
    ).toBeVisible();
    await expect(page.getByText('Savings jar')).toHaveCount(0);

    await page.goto('/');
    await expect(accountChip(page, 'Holiday fund')).toContainText('250.00');
    await expect(totalBalance(page)).toContainText('1,250.00');
});
