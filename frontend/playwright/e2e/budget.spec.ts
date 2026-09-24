import { expect, test } from '../fixtures/test';
import { addTransaction } from '../support/ui';

/** S1, S5: set a monthly limit, overspend it, get told by how much. */
test('sets a budget and reports the overspend', async ({
    page,
    household: _household,
}) => {
    await page.goto('/analytics/budgets');
    const groceries = page.getByRole('button', { name: /Groceries/ });
    await expect(groceries).toContainText('No limit');

    await groceries.click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Monthly limit').fill('100');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expect(groceries).toContainText(/Left\s*100\.00/);

    await page.goto('/transactions');
    await addTransaction(page, {
        amount: '130',
        title: 'Big shop',
        category: 'Groceries',
    });

    await page.goto('/analytics/budgets');
    // Anchored to the label: a bare '30.00' would also match the spent '130.00'.
    await expect(groceries).toContainText(/Over by\s*[−-]?30\.00/);
});
