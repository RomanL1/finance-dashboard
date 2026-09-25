import { expect, type Locator, type Page } from '@playwright/test';

export interface TransactionInput {
    amount: string;
    title: string;
    type?: 'Expense' | 'Income';
    category?: string;
}

/** Opens the add dialog via the FAB (home and transactions page), fills it and waits for it to close. */
export async function addTransaction(
    page: Page,
    input: TransactionInput,
): Promise<void> {
    await page.getByRole('button', { name: 'Add transaction' }).click();
    const dialog = page.getByRole('dialog');
    if (input.type === 'Income') {
        await dialog.getByText('Income', { exact: true }).click();
    }
    await dialog.getByLabel('Amount').fill(input.amount);
    if (input.category) {
        await selectOption(page, dialog.getByLabel('Category'), input.category);
    }
    await dialog.getByLabel('Title (optional)').fill(input.title);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
}

/** mat-select: open the panel, then pick from the overlay (it renders outside the dialog). */
export async function selectOption(
    page: Page,
    select: Locator,
    option: string,
): Promise<void> {
    await select.click();
    await page.getByRole('option', { name: option, exact: true }).click();
}

/** Row of the transaction list, found by its title. */
export function transactionRow(page: Page, title: string): Locator {
    return page.getByRole('listitem').filter({ hasText: title });
}

/** Opens an account row's action menu and picks an item. Transaction rows open the edit dialog on tap instead. */
export async function rowAction(
    page: Page,
    row: Locator,
    menuLabel: string,
    item: string,
): Promise<void> {
    await row.getByRole('button', { name: menuLabel }).click();
    await page.getByRole('menuitem', { name: item }).click();
}

/** Balance chip of one account on the home page. */
export function accountChip(page: Page, description: string): Locator {
    return page
        .getByRole('list', { name: 'Account balances' })
        .getByRole('listitem')
        .filter({ hasText: description });
}

/** "Total balance" block on the home page. */
export function totalBalance(page: Page): Locator {
    return page.getByText('Total balance', { exact: true }).locator('..');
}

/** One figure (Income / Expenses / Net) of the overview stats card. */
export function statFigure(
    page: Page,
    label: 'Income' | 'Expenses' | 'Net',
): Locator {
    return page
        .locator('dl > div')
        .filter({ has: page.getByText(label, { exact: true }) })
        .locator('dd');
}
