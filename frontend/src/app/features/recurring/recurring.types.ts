import { formatDate } from '@angular/common';
import type {
    AccountDto,
    CategoryDto,
    RecurringTransactionDto,
    SaveRecurringTransactionDto,
} from '../../core/api';

export type { RecurringTransactionDto, SaveRecurringTransactionDto };

export type RecurrenceInterval = SaveRecurringTransactionDto['interval'];

export const RECURRENCE_INTERVALS: RecurrenceInterval[] = [
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'half_yearly',
    'yearly',
];

/** Intervals anchored on a day of the month; only these offer the weekend shift. */
export function isMonthBased(interval: RecurrenceInterval): boolean {
    return (
        interval === 'monthly' ||
        interval === 'quarterly' ||
        interval === 'half_yearly' ||
        interval === 'yearly'
    );
}

/** ISO weekdays, Monday first. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Weekday name in the app locale; 1 = Monday … 7 = Sunday. 1 Jan 2024 was a Monday. */
export function weekdayName(weekday: number, locale: string): string {
    return formatDate(new Date(2024, 0, weekday), 'EEEE', locale);
}

/** ISO weekday of a local `YYYY-MM-DD` date. */
export function isoWeekdayOf(date: string): number {
    return parseLocalDate(date).getDay() || 7;
}

/** Local midnight of a `YYYY-MM-DD` date (not UTC, which `new Date('YYYY-MM-DD')` would give). */
export function parseLocalDate(date: string): Date {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y!, m! - 1, d!);
}

export function toLocalDateString(date: Date): string {
    return formatDate(date, 'yyyy-MM-dd', 'en');
}

/** What the recurring dialog needs from its opener. `rule` set = edit mode. */
export interface RecurringDialogData {
    householdId: string;
    categories: CategoryDto[];
    rule?: RecurringTransactionDto;
}

/** Flattened for display: ids resolved to names and currency. */
export interface RecurringRow {
    id: string;
    categoryId: string | null;
    category: string | null;
    /** Falls back to the category name; null only when both are missing. */
    title: string | null;
    accountNumber: number;
    accountName: string;
    currency: string;
    /** Signed minor units: negative for expenses. */
    amount: number;
    varyingAmount: boolean;
    interval: RecurrenceInterval;
    /** Parameter for the schedule text: weekday name or day of month. */
    anchor: string | number | null;
    weekendShift: boolean;
    paused: boolean;
    /** Local `YYYY-MM-DD`: booking day of the next occurrence after today (it may already be booked with its month). */
    nextDate: string;
}

/** Keeps the API order: active first, soonest due first. */
export function toRecurringRows(
    rules: RecurringTransactionDto[],
    accounts: AccountDto[],
    categories: CategoryDto[],
    locale: string,
): RecurringRow[] {
    const accountById = new Map(accounts.map((a) => [a.id, a]));
    const nameByCategory = new Map(categories.map((c) => [c.id, c.name]));
    return rules.map((rule) => {
        const category =
            (rule.categoryId && nameByCategory.get(rule.categoryId)) || null;
        const account = accountById.get(rule.accountId);
        return {
            id: rule.id,
            categoryId: category ? rule.categoryId : null,
            category,
            title: rule.title || category,
            accountNumber: account?.number ?? 0,
            accountName: account?.description ?? '',
            currency: account?.currency ?? '',
            amount: rule.type === 'income' ? rule.amount : -rule.amount,
            varyingAmount: rule.varyingAmount,
            interval: rule.interval as RecurrenceInterval,
            anchor:
                rule.weekday != null
                    ? weekdayName(rule.weekday, locale)
                    : rule.dayOfMonth,
            weekendShift: rule.weekendShift,
            paused: rule.paused,
            nextDate: rule.nextDate,
        };
    });
}
