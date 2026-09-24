import { expect, test } from '../fixtures/test';
import {
    accountChip,
    addTransaction,
    statFigure,
    totalBalance,
    transactionRow,
} from '../support/ui';

/** M13, M14, M10: booking from home keeps the user there and every figure updates. */
test('books income and an expense from home and every figure updates', async ({
    page,
    household,
}) => {
    await page.goto('/');
    await expect(
        page.getByRole('heading', { name: `Household ${household}` }),
    ).toBeVisible();
    await expect(totalBalance(page)).toContainText('1,000.00');

    await addTransaction(page, {
        type: 'Income',
        amount: '500',
        title: 'Salary',
    });
    await addTransaction(page, {
        amount: '120',
        title: 'Weekly shop',
        category: 'Groceries',
    });

    await expect(page).toHaveURL(/\/$/);
    await expect(transactionRow(page, 'Salary')).toContainText('500.00');
    await expect(transactionRow(page, 'Weekly shop')).toContainText('120.00');
    await expect(accountChip(page, 'Main account')).toContainText('1,380.00');
    await expect(totalBalance(page)).toContainText('1,380.00');
    await expect(statFigure(page, 'Income')).toContainText('500.00');
    await expect(statFigure(page, 'Expenses')).toContainText('120.00');
    await expect(statFigure(page, 'Net')).toContainText('380.00');
});
