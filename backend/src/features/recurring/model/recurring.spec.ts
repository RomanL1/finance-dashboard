import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../shared/kernel/index.js';
import {
    advance,
    bookingHorizon,
    buildRecurringFields,
    buildRecurringTransaction,
    cursorAfterEdit,
    cursorOnResume,
    dueDate,
    firstOccurrenceFrom,
    lastPassedOccurrence,
    nextDate,
    type RecurringTransactionFields,
    type RecurringTransactionInput,
} from './recurring.js';

const base: RecurringTransactionInput = {
    accountId: 'acc-1',
    type: 'expense',
    amount: 180000,
    interval: 'monthly',
    startDate: '2026-01-31',
};

function schedule(
    overrides: Partial<RecurringTransactionInput> = {},
): RecurringTransactionFields {
    return buildRecurringFields({ ...base, ...overrides });
}

/** Every occurrence from the start date up to and including `until`. */
function occurrences(s: RecurringTransactionFields, until: string): string[] {
    const cursor = buildRecurringTransaction(s);
    return advance(s, cursor, until)?.due.map((d) => d.occurrence) ?? [];
}

describe('buildRecurringFields', () => {
    it('defaults the day of month to the start date and drops the weekday', () => {
        expect(schedule({ weekday: 3 })).toMatchObject({
            dayOfMonth: 31,
            weekday: null,
        });
    });

    it("defaults the weekday to the start date's for weekly rules", () => {
        // 2026-01-31 is a Saturday.
        expect(schedule({ interval: 'weekly', dayOfMonth: 5 })).toMatchObject({
            weekday: 6,
            dayOfMonth: null,
        });
    });

    it('keeps weekend shift only for monthly and longer intervals', () => {
        expect(schedule({ weekendShift: true }).weekendShift).toBe(true);
        expect(
            schedule({ interval: 'weekly', weekendShift: true }).weekendShift,
        ).toBe(false);
        expect(
            schedule({ interval: 'daily', weekendShift: true }).weekendShift,
        ).toBe(false);
    });

    it('trims texts and nulls empty ones', () => {
        expect(
            buildRecurringFields({
                ...base,
                title: '  Rent ',
                description: ' ',
            }),
        ).toMatchObject({ title: 'Rent', description: null, categoryId: null });
    });

    it.each([
        [{ amount: 0 }],
        [{ amount: 1.5 }],
        [{ startDate: '2026-02-30' }],
        [{ startDate: '31.01.2026' }],
        [{ dayOfMonth: 32 }],
        [{ interval: 'weekly' as const, weekday: 8 }],
    ])('rejects %o', (overrides) => {
        expect(() => buildRecurringFields({ ...base, ...overrides })).toThrow(
            ValidationError,
        );
    });
});

describe('occurrences', () => {
    it('daily: every day from the start', () => {
        expect(
            occurrences(schedule({ interval: 'daily' }), '2026-02-02'),
        ).toEqual(['2026-01-31', '2026-02-01', '2026-02-02']);
    });

    it('weekly: on the chosen weekday, first one on or after the start', () => {
        // Start Saturday 31 Jan, weekday Monday.
        expect(
            occurrences(
                schedule({ interval: 'weekly', weekday: 1 }),
                '2026-02-16',
            ),
        ).toEqual(['2026-02-02', '2026-02-09', '2026-02-16']);
    });

    it('monthly on the 31st falls on the last day of shorter months (C10)', () => {
        expect(occurrences(schedule(), '2026-05-31')).toEqual([
            '2026-01-31',
            '2026-02-28',
            '2026-03-31',
            '2026-04-30',
            '2026-05-31',
        ]);
    });

    it('monthly on the 29th hits 29 Feb in a leap year, 28 Feb otherwise', () => {
        const s = schedule({ startDate: '2027-12-29', dayOfMonth: 29 });
        expect(occurrences(s, '2028-03-01')).toEqual([
            '2027-12-29',
            '2028-01-29',
            '2028-02-29',
        ]);
        expect(
            firstOccurrenceFrom(
                schedule({ startDate: '2026-01-29' }),
                '2026-02-01',
            ),
        ).toBe('2026-02-28');
    });

    it('skips the start month when the day already passed', () => {
        expect(
            occurrences(
                schedule({ startDate: '2026-01-20', dayOfMonth: 5 }),
                '2026-03-05',
            ),
        ).toEqual(['2026-02-05', '2026-03-05']);
    });

    it('quarterly, half-yearly and yearly count months from the start month', () => {
        expect(
            occurrences(schedule({ interval: 'quarterly' }), '2026-12-31'),
        ).toEqual(['2026-01-31', '2026-04-30', '2026-07-31', '2026-10-31']);
        expect(
            occurrences(schedule({ interval: 'half_yearly' }), '2027-01-31'),
        ).toEqual(['2026-01-31', '2026-07-31', '2027-01-31']);
        expect(
            occurrences(
                schedule({
                    interval: 'yearly',
                    startDate: '2024-02-29',
                }),
                '2026-12-31',
            ),
        ).toEqual(['2024-02-29', '2025-02-28', '2026-02-28']);
    });
});

describe('weekend shift', () => {
    const shifted = schedule({
        startDate: '2026-08-01',
        dayOfMonth: 1,
        weekendShift: true,
    });

    it('books a Saturday or Sunday occurrence on the Friday before', () => {
        // 1 Aug 2026 is a Saturday, 1 Nov 2026 a Sunday.
        expect(dueDate(shifted, '2026-08-01')).toBe('2026-07-31');
        expect(dueDate(shifted, '2026-11-01')).toBe('2026-10-30');
        expect(dueDate(shifted, '2026-09-01')).toBe('2026-09-01');
    });

    it('leaves weekend days alone without the option', () => {
        expect(dueDate(schedule(), '2026-08-01')).toBe('2026-08-01');
    });

    it('is due on the shifted day but keeps the schedule on the nominal one', () => {
        const cursor = buildRecurringTransaction(shifted);
        expect(cursor.nextDueDate).toBe('2026-07-31');
        const step = advance(shifted, cursor, '2026-07-31')!;
        expect(step.due).toEqual([
            { occurrence: '2026-08-01', dueDate: '2026-07-31' },
        ]);
        expect(step.cursor).toEqual({
            nextOccurrence: '2026-09-01',
            nextDueDate: '2026-09-01',
            lastOccurrence: '2026-08-01',
        });
    });
});

describe('advance', () => {
    it('is null when nothing is due yet', () => {
        const cursor = buildRecurringTransaction(schedule());
        expect(advance(schedule(), cursor, '2026-01-30')).toBeNull();
    });

    it('books today’s occurrence', () => {
        const cursor = buildRecurringTransaction(schedule());
        expect(advance(schedule(), cursor, '2026-01-31')?.due).toHaveLength(1);
    });
});

describe('cursorAfterEdit', () => {
    it('continues right after the last passed occurrence', () => {
        // Was the 31st, last booked 31 Jan; moving to the 15th starts in February.
        expect(
            cursorAfterEdit(schedule({ dayOfMonth: 15 }), '2026-01-31'),
        ).toEqual({
            nextOccurrence: '2026-02-15',
            nextDueDate: '2026-02-15',
            lastOccurrence: '2026-01-31',
        });
    });

    it('starts at the start date when nothing was booked yet', () => {
        expect(
            cursorAfterEdit(schedule({ startDate: '2026-03-10' }), null)
                .nextOccurrence,
        ).toBe('2026-03-10');
    });
});

describe('cursorOnResume', () => {
    const daily = schedule({ interval: 'daily', startDate: '2026-01-01' });

    it('skips what fell into the pause but keeps today', () => {
        const cursor = {
            nextOccurrence: '2026-01-05',
            nextDueDate: '2026-01-05',
            lastOccurrence: '2026-01-04',
        };
        expect(cursorOnResume(daily, cursor, '2026-01-20')).toEqual({
            nextOccurrence: '2026-01-20',
            nextDueDate: '2026-01-20',
            lastOccurrence: '2026-01-19',
        });
    });

    it('keeps a cursor that is not overdue', () => {
        const cursor = {
            nextOccurrence: '2026-02-01',
            nextDueDate: '2026-02-01',
            lastOccurrence: '2026-01-31',
        };
        expect(cursorOnResume(daily, cursor, '2026-01-20')).toBe(cursor);
    });

    it('keeps an occurrence shifted onto today', () => {
        // Sunday 1 Nov 2026 is booked Friday 30 Oct.
        const monthly = schedule({
            startDate: '2026-10-01',
            dayOfMonth: 1,
            weekendShift: true,
        });
        const cursor = {
            nextOccurrence: '2026-10-01',
            nextDueDate: '2026-10-01',
            lastOccurrence: null,
        };
        expect(cursorOnResume(monthly, cursor, '2026-10-30')).toMatchObject({
            nextOccurrence: '2026-11-01',
            nextDueDate: '2026-10-30',
        });
    });
});

describe('bookingHorizon', () => {
    it('is the last day of the month', () => {
        expect(bookingHorizon('2026-09-01')).toBe('2026-09-30');
        expect(bookingHorizon('2028-02-10')).toBe('2028-02-29');
    });
});

describe('lastPassedOccurrence', () => {
    const monthly = schedule({ startDate: '2026-07-31' });

    it('is the last booked occurrence when its day has come', () => {
        expect(lastPassedOccurrence(monthly, '2026-08-31', '2026-09-26')).toBe(
            '2026-08-31',
        );
    });

    it('steps back over occurrences booked ahead', () => {
        expect(lastPassedOccurrence(monthly, '2026-09-30', '2026-09-26')).toBe(
            '2026-08-31',
        );
    });

    it('is null when nothing booked has come due yet', () => {
        expect(lastPassedOccurrence(monthly, null, '2026-09-26')).toBeNull();
        expect(
            lastPassedOccurrence(
                schedule({ startDate: '2026-09-28', interval: 'daily' }),
                '2026-09-30',
                '2026-09-26',
            ),
        ).toBeNull();
    });

    it('counts a weekend occurrence booked on the Friday before as passed', () => {
        // Sun 1 Nov 2026 is booked Fri 30 Oct.
        const shifted = schedule({
            startDate: '2026-10-01',
            dayOfMonth: 1,
            weekendShift: true,
        });
        expect(lastPassedOccurrence(shifted, '2026-11-01', '2026-10-30')).toBe(
            '2026-11-01',
        );
        expect(lastPassedOccurrence(shifted, '2026-11-01', '2026-10-29')).toBe(
            '2026-10-01',
        );
    });
});

describe('nextDate', () => {
    const monthly = schedule({ startDate: '2026-07-31' });

    it('is the upcoming occurrence already booked with its month', () => {
        expect(nextDate(monthly, '2026-09-30', '2026-09-26')).toBe(
            '2026-09-30',
        );
    });

    it("moves on once today's occurrence has come", () => {
        expect(nextDate(monthly, '2026-09-30', '2026-09-30')).toBe(
            '2026-10-31',
        );
    });

    it('is the first one on the schedule when nothing is booked', () => {
        expect(nextDate(monthly, null, '2026-07-01')).toBe('2026-07-31');
    });

    it('skips occurrences a pause left unbooked', () => {
        expect(nextDate(monthly, '2026-08-31', '2026-12-15')).toBe(
            '2026-12-31',
        );
    });

    it('is the shifted booking day', () => {
        const shifted = schedule({
            startDate: '2026-10-01',
            dayOfMonth: 1,
            weekendShift: true,
        });
        expect(nextDate(shifted, '2026-10-01', '2026-10-02')).toBe(
            '2026-10-30',
        );
    });
});
