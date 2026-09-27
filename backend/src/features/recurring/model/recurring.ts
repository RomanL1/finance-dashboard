import {
    addDays,
    addYears,
    dateInMonth,
    endOfMonth,
    dayOfMonth,
    isLocalDate,
    isoWeekday,
    monthIndex,
    newId,
    ValidationError,
    type Id,
    type LocalDate,
} from '../../../shared/kernel/index.js';
import type { TransactionType } from '../../transaction/model/transaction.js';
import { RECURRENCE_INTERVALS } from './recurring.schema.js';

export type RecurrenceInterval = (typeof RECURRENCE_INTERVALS)[number];

/** When occurrences fall. Dates are calendar dates in the household time zone. */
export interface Schedule {
    interval: RecurrenceInterval;
    startDate: LocalDate;
    /** Weekly only, ISO 1 = Monday … 7 = Sunday; null otherwise. */
    weekday: number | null;
    /** Monthly and longer only, 1–31; null otherwise. */
    dayOfMonth: number | null;
    /** Monthly and longer only; always false otherwise. */
    weekendShift: boolean;
}

export interface RecurringTransactionFields extends Schedule {
    accountId: Id;
    categoryId: Id | null;
    type: TransactionType;
    amount: number;
    title: string | null;
    description: string | null;
    varyingAmount: boolean;
}

/** Where the schedule stands. `nextDueDate` is `nextOccurrence` after the weekend shift. */
export interface Cursor {
    nextOccurrence: LocalDate;
    nextDueDate: LocalDate;
    lastOccurrence: LocalDate | null;
}

export interface CreateRecurringTransaction
    extends RecurringTransactionFields, Cursor {
    id: Id;
    paused: boolean;
}

export interface RecurringTransaction extends CreateRecurringTransaction {
    createdAt: Date;
}

/** What the API shows: the rule plus the day its next occurrence is booked for, booked yet or not. */
export interface RecurringTransactionView extends RecurringTransaction {
    /** After today; the cursor alone would skip the upcoming occurrences already booked this month. */
    nextDate: LocalDate;
}

export interface RecurringTransactionInput {
    accountId: Id;
    categoryId?: Id | null;
    type: TransactionType;
    amount: number;
    title?: string | null;
    description?: string | null;
    interval: RecurrenceInterval;
    weekday?: number | null;
    dayOfMonth?: number | null;
    startDate: LocalDate;
    varyingAmount?: boolean;
    weekendShift?: boolean;
}

/** Months between occurrences; undefined for day-based intervals. */
const MONTH_STEPS: Partial<Record<RecurrenceInterval, number>> = {
    monthly: 1,
    quarterly: 3,
    half_yearly: 6,
    yearly: 12,
};

export function isMonthBased(interval: RecurrenceInterval): boolean {
    return MONTH_STEPS[interval] !== undefined;
}

/**
 * Validates and normalizes the input: the anchor that does not fit the interval is dropped,
 * a missing one defaults to the start date's (story C7), and weekend shift only exists for
 * monthly and longer intervals.
 */
export function buildRecurringFields(
    input: RecurringTransactionInput,
): RecurringTransactionFields {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
        throw new ValidationError(
            'Recurring transaction amount must be a positive integer',
        );
    }
    if (!isLocalDate(input.startDate)) {
        throw new ValidationError('Start date must be a YYYY-MM-DD date');
    }
    const weekly = input.interval === 'weekly';
    const monthBased = isMonthBased(input.interval);
    const weekday = weekly
        ? (input.weekday ?? isoWeekday(input.startDate))
        : null;
    const day = monthBased
        ? (input.dayOfMonth ?? dayOfMonth(input.startDate))
        : null;
    if (weekday !== null && !isIntBetween(weekday, 1, 7)) {
        throw new ValidationError('Weekday must be between 1 and 7');
    }
    if (day !== null && !isIntBetween(day, 1, 31)) {
        throw new ValidationError('Day of month must be between 1 and 31');
    }
    return {
        accountId: input.accountId,
        categoryId: input.categoryId ?? null,
        type: input.type,
        amount: input.amount,
        title: input.title?.trim() || null,
        description: input.description?.trim() || null,
        interval: input.interval,
        weekday,
        dayOfMonth: day,
        startDate: input.startDate,
        varyingAmount: input.varyingAmount ?? false,
        weekendShift: monthBased && (input.weekendShift ?? false),
    };
}

export function buildRecurringTransaction(
    fields: RecurringTransactionFields,
): CreateRecurringTransaction {
    return {
        ...fields,
        id: newId(),
        paused: false,
        ...cursorFrom(fields, fields.startDate, null),
    };
}

/** Cursor at the first occurrence on or after `from`. */
export function cursorFrom(
    schedule: Schedule,
    from: LocalDate,
    lastOccurrence: LocalDate | null,
): Cursor {
    const nextOccurrence = firstOccurrenceFrom(schedule, from);
    return {
        nextOccurrence,
        nextDueDate: dueDate(schedule, nextOccurrence),
        lastOccurrence,
    };
}

/** Where to continue after an edit: right after the last passed occurrence, so nothing is booked twice (story C11). */
export function cursorAfterEdit(
    schedule: Schedule,
    lastOccurrence: LocalDate | null,
): Cursor {
    return cursorFrom(
        schedule,
        lastOccurrence ? addDays(lastOccurrence, 1) : schedule.startDate,
        lastOccurrence,
    );
}

/** Earliest occurrence on the schedule that falls on or after `from` (never before the start date). */
export function firstOccurrenceFrom(
    schedule: Schedule,
    from: LocalDate,
): LocalDate {
    const earliest = maxDate(from, schedule.startDate);
    const step = MONTH_STEPS[schedule.interval];
    if (step !== undefined) {
        const startMonth = monthIndex(schedule.startDate);
        let k = Math.max(
            0,
            Math.floor((monthIndex(earliest) - startMonth) / step),
        );
        for (;;) {
            const month = startMonth + k * step;
            const date = dateInMonth(
                Math.floor(month / 12),
                month % 12,
                schedule.dayOfMonth!,
            );
            if (date >= earliest) return date;
            k++;
        }
    }
    if (schedule.interval === 'weekly') {
        const ahead = (schedule.weekday! - isoWeekday(earliest) + 7) % 7;
        return addDays(earliest, ahead);
    }
    return earliest;
}

export function nextOccurrenceAfter(
    schedule: Schedule,
    occurrence: LocalDate,
): LocalDate {
    return firstOccurrenceFrom(schedule, addDays(occurrence, 1));
}

/** The day an occurrence gets booked: Saturday/Sunday move to the Friday before when the rule shifts weekends. */
export function dueDate(schedule: Schedule, occurrence: LocalDate): LocalDate {
    if (!schedule.weekendShift) return occurrence;
    const weekday = isoWeekday(occurrence);
    return weekday >= 6 ? addDays(occurrence, 5 - weekday) : occurrence;
}

/** One occurrence to book; `dueDate` is the booking day. */
export interface DueOccurrence {
    occurrence: LocalDate;
    dueDate: LocalDate;
}

export interface Advance {
    due: DueOccurrence[];
    cursor: Cursor;
}

/** Guard against a runaway loop; a year plus a month of daily occurrences is the most a rule can owe (start date ≤ 1 year back). */
const MAX_OCCURRENCES_PER_RUN = 1000;

/** Everything due in the current month is booked when it starts, so the month shows what will happen in it. */
export function bookingHorizon(today: LocalDate): LocalDate {
    return endOfMonth(today);
}

/**
 * Walks the cursor over every occurrence due on or before `until` (backfill, downtime
 * catch-up and booking the month ahead take the same path). Null when nothing is due.
 */
export function advance(
    schedule: Schedule,
    cursor: Cursor,
    until: LocalDate,
): Advance | null {
    const due: DueOccurrence[] = [];
    let { nextOccurrence, lastOccurrence } = cursor;
    let nextDue = cursor.nextDueDate;
    while (nextDue <= until && due.length < MAX_OCCURRENCES_PER_RUN) {
        due.push({ occurrence: nextOccurrence, dueDate: nextDue });
        lastOccurrence = nextOccurrence;
        nextOccurrence = nextOccurrenceAfter(schedule, nextOccurrence);
        nextDue = dueDate(schedule, nextOccurrence);
    }
    if (due.length === 0) return null;
    return {
        due,
        cursor: { nextOccurrence, nextDueDate: nextDue, lastOccurrence },
    };
}

/**
 * The last booked occurrence whose day has come. Bookings after it are upcoming: they
 * follow the recurring transaction and are re-created or removed when it changes.
 */
export function lastPassedOccurrence(
    schedule: Schedule,
    lastOccurrence: LocalDate | null,
    today: LocalDate,
): LocalDate | null {
    if (!lastOccurrence || dueDate(schedule, lastOccurrence) <= today) {
        return lastOccurrence;
    }
    // Booked ahead: every interval has an occurrence within a year, so walking from there finds it.
    let passed: LocalDate | null = null;
    let occurrence = firstOccurrenceFrom(
        schedule,
        addDays(addYears(today, -1), -3),
    );
    while (
        occurrence < lastOccurrence &&
        dueDate(schedule, occurrence) <= today
    ) {
        passed = occurrence;
        occurrence = nextOccurrenceAfter(schedule, occurrence);
    }
    return passed;
}

/** The booking day of the first occurrence after today (today's has come), whether this month already booked it or not. */
export function nextDate(
    schedule: Schedule,
    lastOccurrence: LocalDate | null,
    today: LocalDate,
): LocalDate {
    const passed = lastPassedOccurrence(schedule, lastOccurrence, today);
    let occurrence = passed
        ? nextOccurrenceAfter(schedule, passed)
        : firstOccurrenceFrom(schedule, schedule.startDate);
    while (dueDate(schedule, occurrence) <= today) {
        occurrence = nextOccurrenceAfter(schedule, occurrence);
    }
    return dueDate(schedule, occurrence);
}

/**
 * Resuming skips what fell into the pause (story C11): the cursor moves to the first
 * occurrence not yet overdue, counting today's as still due.
 */
export function cursorOnResume(
    schedule: Schedule,
    cursor: Cursor,
    today: LocalDate,
): Cursor {
    if (cursor.nextDueDate >= today) return cursor;
    // The weekend shift books at most two days early, so nothing before today - 2 can still be due.
    let next = firstOccurrenceFrom(
        schedule,
        maxDate(cursor.nextOccurrence, addDays(today, -2)),
    );
    while (dueDate(schedule, next) < today) {
        next = nextOccurrenceAfter(schedule, next);
    }
    return {
        nextOccurrence: next,
        nextDueDate: dueDate(schedule, next),
        // Everything before `next` counts as passed, so a later edit never books the skipped ones.
        lastOccurrence: addDays(next, -1),
    };
}

function maxDate(a: LocalDate, b: LocalDate): LocalDate {
    return a > b ? a : b;
}

function isIntBetween(value: number, min: number, max: number): boolean {
    return Number.isInteger(value) && value >= min && value <= max;
}
