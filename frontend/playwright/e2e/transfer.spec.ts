import { expect, test } from '../fixtures/test';
import { accountChip, statFigure, totalBalance } from '../support/ui';

/** Settling a credit card from home: both balances move, the period figures do not. */
test('settles a credit card debt from another account', async ({
    page,
    household,
}) => {
    const api = page.request;
    const households = await (await api.get('/api/households')).json();
    const householdId = households.find(
        (h: { name: string }) => h.name === household,
    ).id;
    const card = await (
        await api.post(`/api/households/${householdId}/accounts`, {
            data: {
                description: 'Visa',
                type: 'credit_card',
                currency: 'CHF',
                initialValue: 0,
                startDate: new Date().toISOString().slice(0, 10),
            },
        })
    ).json();
    const charged = await api.post(
        `/api/households/${householdId}/transactions`,
        {
            data: {
                accountId: card.id,
                type: 'expense',
                amount: 2_000,
                title: 'Streaming',
                date: new Date().toISOString(),
            },
        },
    );
    expect(charged.ok()).toBe(true);

    await page.goto('/');
    await expect(accountChip(page, 'Visa')).toContainText('−20.00');
    await expect(totalBalance(page)).toContainText('980.00');

    await accountChip(page, 'Visa')
        .getByRole('button', { name: 'Settle Visa' })
        .click();
    const dialog = page.getByRole('dialog');
    await expect(
        dialog.getByRole('heading', { name: 'Settle credit card' }),
    ).toBeVisible();
    await expect(dialog.getByLabel('Amount')).toHaveValue('20');
    // The only other account pays.
    await expect(dialog.getByLabel('From account')).toContainText(
        'Main account',
    );
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();

    await expect(accountChip(page, 'Visa')).toContainText('0.00');
    await expect(accountChip(page, 'Visa')).not.toContainText('−');
    await expect(
        accountChip(page, 'Visa').getByRole('button', { name: 'Settle Visa' }),
    ).toHaveCount(0);
    await expect(accountChip(page, 'Main account')).toContainText('980.00');
    await expect(totalBalance(page)).toContainText('980.00');
    await expect(statFigure(page, 'Income')).toContainText('0.00');
    await expect(statFigure(page, 'Expenses')).toContainText('20.00');

    await page.goto('/transactions/transfers');
    await expect(
        page.getByRole('listitem').filter({ hasText: 'Visa' }),
    ).toContainText('20.00');
});
