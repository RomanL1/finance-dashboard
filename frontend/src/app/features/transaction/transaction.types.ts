import type {
    AccountDto,
    CategoryDto,
    CreateTransactionDto,
    TransactionDto,
} from '../../core/api';

export type { CreateTransactionDto, TransactionDto };

/** Preselected form values; ids that no longer exist are ignored by the form. */
export interface TransactionDefaults {
    accountId?: string;
    categoryId?: string | null;
}

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
    /** Null when uncategorized or the category was deleted. */
    category: string | null;
    /** Falls back to the category name; null only when both are missing. */
    title: string | null;
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
    return transactions.map((t) => {
        const category =
            (t.categoryId && nameByCategory.get(t.categoryId)) || null;
        return {
            id: t.id,
            date: t.date,
            category,
            title: t.title || category,
            currency: currencyByAccount.get(t.accountId) ?? '',
            amount: t.type === 'income' ? t.amount : -t.amount,
        };
    });
}
