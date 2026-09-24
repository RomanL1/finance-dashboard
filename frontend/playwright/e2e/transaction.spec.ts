import { expect, test } from '../fixtures/test';
import {
    accountChip,
    addTransaction,
    rowAction,
    transactionRow,
} from '../support/ui';

/** M8, M9, M11, M3: the balance follows every add, edit and delete, and data survives a reload. */
test('adds, edits and deletes an expense while the balance follows', async ({
    page,
    household: _household,
}) => {
    await page.goto('/transactions');
    await addTransaction(page, { amount: '12.50', title: 'Coffee beans' });
    await expect(transactionRow(page, 'Coffee beans')).toContainText('12.50');

    await page.reload();
    await expect(transactionRow(page, 'Coffee beans')).toContainText('12.50');

    await page.goto('/');
    await expect(accountChip(page, 'Main account')).toContainText('987.50');

    await page.goto('/transactions');
    await rowAction(
        page,
        transactionRow(page, 'Coffee beans'),
        'Transaction actions',
        'Edit',
    );
    const dialog = page.getByRole('dialog');
    await expect(
        dialog.getByRole('heading', { name: 'Edit transaction' }),
    ).toBeVisible();
    await dialog.getByLabel('Amount').fill('20');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expect(transactionRow(page, 'Coffee beans')).toContainText('20.00');

    await page.goto('/');
    await expect(accountChip(page, 'Main account')).toContainText('980.00');

    await page.goto('/transactions');
    await rowAction(
        page,
        transactionRow(page, 'Coffee beans'),
        'Transaction actions',
        'Delete',
    );
    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Delete' })
        .click();
    await expect(page.getByText('No transactions yet.')).toBeVisible();

    await page.goto('/');
    await expect(accountChip(page, 'Main account')).toContainText('1,000.00');
});
