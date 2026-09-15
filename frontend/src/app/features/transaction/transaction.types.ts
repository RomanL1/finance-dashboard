import { formatDate } from '@angular/common';
import type {
    AccountDto,
    CategoryDto,
    CreateTransactionDto,
    TransactionDto,
    TransactionPageDto,
} from '../../core/api';

export type { CreateTransactionDto, TransactionDto, TransactionPageDto };

/** Category filter value the API reads as "no category"; mirrors the backend sentinel. */
export const UNCATEGORIZED = 'none';

/** Which rows to show; `undefined` = no restriction. `categoryId` may be `UNCATEGORIZED`. */
export interface TransactionFilter {
    accountId?: string;
    categoryId?: string;
}

export interface TransactionQuery extends TransactionFilter {
    /** 1-based */
    page: number;
}

/** Query params `account`, `category`, `page`; garbage falls back to the first unfiltered page. */
export function parseTransactionParams(
    params: Record<string, string | undefined>,
): TransactionQuery {
    const page = Number(params['page']);
    return {
        accountId: params['account'] || undefined,
        categoryId: params['category'] || undefined,
        page: Number.isInteger(page) && page > 0 ? page : 1,
    };
}

/** Inverse of `parseTransactionParams`; `null` removes a param when merged into the URL. */
export function toTransactionParams(
    query: TransactionQuery,
): Record<string, string | null> {
    return {
        account: query.accountId ?? null,
        category: query.categoryId ?? null,
        page: query.page > 1 ? String(query.page) : null,
    };
}

/** Resource params are compared by reference; this keeps unrelated URL changes (period) from refetching. */
export function sameQuery(a: TransactionQuery, b: TransactionQuery): boolean {
    return (
        a.accountId === b.accountId &&
        a.categoryId === b.categoryId &&
        a.page === b.page
    );
}

export function pageCount(total: number, pageSize: number): number {
    return Math.max(1, Math.ceil(total / pageSize));
}

/** Prefilled form values: last-used ids for a new entry, the full row when editing. Unknown ids are ignored. */
export type TransactionDefaults = Partial<CreateTransactionDto>;

/** What the transaction dialog needs from its opener. `transaction` set = edit mode. */
export interface TransactionDialogData {
    householdId: string;
    /** Accounts are fetched by the dialog itself: archive dates must be fresh. */
    categories: CategoryDto[];
    transaction?: TransactionDto;
}

/** Flattened for display: ids resolved to names and currency. */
export interface TransactionRow {
    id: string;
    /** ISO timestamp, kept for `<time datetime>`. */
    date: string;
    /** Display-ready timestamp; precision depends on the group ("14:05", "Tue 14:05", "03.09. 14:05"). */
    when: string;
    /** Null when uncategorized or the category was deleted. Drives the avatar color. */
    categoryId: string | null;
    /** Null when uncategorized or the category was deleted. */
    category: string | null;
    /** Badge number and short name of the account, so multi-account households can tell rows apart. */
    accountNumber: number;
    accountName: string;
    /** Falls back to the category name; null only when both are missing. */
    title: string | null;
    currency: string;
    /** Signed minor units: negative for expenses. */
    amount: number;
}

/**
 * Rows bucketed by recency, in display order:
 * today → upcoming (after today, ascending) → this week (Mon–Sun) → earlier this year → one group per past year.
 * Empty groups are omitted. Only `past` groups carry a year, since the others are implied by "now".
 */
export type TransactionGroup =
    | { kind: 'upcoming' | 'today' | 'week' | 'year'; rows: TransactionRow[] }
    | { kind: 'past'; year: number; rows: TransactionRow[] };

const FORMAT: Record<TransactionGroup['kind'], string> = {
    upcoming: 'dd.MM. HH:mm',
    today: 'HH:mm',
    week: 'EEE HH:mm',
    year: 'dd.MM. HH:mm',
    past: 'dd.MM. HH:mm',
};

/** Local midnight of the Monday of the week containing `d`. */
function startOfWeek(d: Date): Date {
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return monday;
}

/** Bucket key plus, for past years, the year. `now` is passed in so results are testable. */
function bucketOf(
    date: Date,
    now: Date,
): { kind: TransactionGroup['kind']; year?: number } {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (date >= tomorrow) return { kind: 'upcoming' };
    if (date >= today) return { kind: 'today' };
    if (date >= startOfWeek(now)) return { kind: 'week' };
    if (date.getFullYear() === now.getFullYear()) return { kind: 'year' };
    return { kind: 'past', year: date.getFullYear() };
}

/** Input must be sorted by date descending (as the API returns it); group order relies on it. */
export function toTransactionGroups(
    transactions: TransactionDto[],
    accounts: AccountDto[],
    categories: CategoryDto[],
    now: Date,
    locale: string,
): TransactionGroup[] {
    const accountById = new Map(accounts.map((a) => [a.id, a]));
    const nameByCategory = new Map(categories.map((c) => [c.id, c.name]));
    const groups: TransactionGroup[] = [];

    for (const t of transactions) {
        const date = new Date(t.date);
        const bucket = bucketOf(date, now);
        let group = groups.at(-1);
        if (
            !group ||
            group.kind !== bucket.kind ||
            (group.kind === 'past' && group.year !== bucket.year)
        ) {
            group =
                bucket.kind === 'past'
                    ? { kind: 'past', year: bucket.year!, rows: [] }
                    : { kind: bucket.kind, rows: [] };
            groups.push(group);
        }
        const category =
            (t.categoryId && nameByCategory.get(t.categoryId)) || null;
        const account = accountById.get(t.accountId);
        group.rows.push({
            id: t.id,
            date: t.date,
            when: formatDate(date, FORMAT[bucket.kind], locale),
            categoryId: category ? t.categoryId : null,
            category,
            title: t.title || category,
            accountNumber: account?.number ?? 0,
            accountName: account?.description ?? '',
            currency: account?.currency ?? '',
            amount: t.type === 'income' ? t.amount : -t.amount,
        });
    }

    // Built newest-first, so upcoming lands at index 0; move it behind today.
    const upcoming =
        groups[0]?.kind === 'upcoming' ? groups.shift() : undefined;
    if (upcoming) {
        upcoming.rows.reverse();
        groups.splice(groups[0]?.kind === 'today' ? 1 : 0, 0, upcoming);
    }
    return groups;
}
