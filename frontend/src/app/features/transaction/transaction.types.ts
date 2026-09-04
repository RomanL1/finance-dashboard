import type {
    AccountDto,
    CategoryDto,
    CreateTransactionDto,
    TransactionDto,
} from '../../core/api';

export type { CreateTransactionDto, TransactionDto };

/** What the add-transaction dialog needs from its opener. */
export interface TransactionDialogData {
    householdId: string;
    accounts: AccountDto[];
    categories: CategoryDto[];
}

/** Flattened for display: ids resolved to names and currency. */
export interface TransactionRow {
    id: string;
    date: string;
    category: string;
    title: string;
    currency: string;
    /** Signed minor units: negative for expenses. */
    amount: number;
}

export function toTransactionRows(
    transactions: TransactionDto[],
    accounts: AccountDto[],
    categories: CategoryDto[],
): TransactionRow[] {
    const currencyByAccount = new Map(accounts.map((a) => [a.id, a.currency]));
    const nameByCategory = new Map(categories.map((c) => [c.id, c.name]));
    return transactions.map((t) => ({
        id: t.id,
        date: t.date,
        category: nameByCategory.get(t.categoryId) ?? '',
        title: t.title,
        currency: currencyByAccount.get(t.accountId) ?? '',
        amount: t.type === 'income' ? t.amount : -t.amount,
    }));
}
