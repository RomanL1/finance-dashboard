import type { AccountDto, CategoryDto } from '../../core/api';
import {
    isMonthBased,
    isoWeekdayOf,
    parseLocalDate,
    toRecurringRows,
    weekdayName,
    type RecurringTransactionDto,
} from './recurring.types';

const ACCOUNTS = [
    { id: 'a1', number: 2, description: 'Main', currency: 'CHF' },
] as AccountDto[];
const CATEGORIES = [{ id: 'c1', name: 'Housing' }] as CategoryDto[];

function rule(
    overrides: Partial<RecurringTransactionDto> = {},
): RecurringTransactionDto {
    return {
        id: 'r1',
        accountId: 'a1',
        categoryId: 'c1',
        type: 'expense',
        amount: 180000,
        title: null,
        description: null,
        interval: 'monthly',
        weekday: null,
        dayOfMonth: 31,
        startDate: '2026-01-31',
        varyingAmount: false,
        weekendShift: true,
        paused: false,
        nextDate: '2026-10-30',
        createdAt: '',
        ...overrides,
    };
}

describe('recurring types', () => {
    it('knows the month-based intervals', () => {
        expect(isMonthBased('monthly')).toBe(true);
        expect(isMonthBased('yearly')).toBe(true);
        expect(isMonthBased('weekly')).toBe(false);
        expect(isMonthBased('daily')).toBe(false);
    });

    it('reads local dates without a UTC shift', () => {
        expect(parseLocalDate('2026-09-27').getDate()).toBe(27);
        expect(isoWeekdayOf('2026-09-27')).toBe(7);
        expect(isoWeekdayOf('2026-09-28')).toBe(1);
    });

    it('names weekdays in the locale, Monday first', () => {
        expect(weekdayName(1, 'en')).toBe('Monday');
        expect(weekdayName(7, 'en')).toBe('Sunday');
    });

    it('flattens rules for the list', () => {
        const [monthly, weekly] = toRecurringRows(
            [
                rule(),
                rule({
                    id: 'r2',
                    type: 'income',
                    title: 'Pocket money',
                    categoryId: 'gone',
                    interval: 'weekly',
                    weekday: 5,
                    dayOfMonth: null,
                    weekendShift: false,
                    paused: true,
                }),
            ],
            ACCOUNTS,
            CATEGORIES,
            'en',
        );
        expect(monthly).toEqual({
            id: 'r1',
            categoryId: 'c1',
            category: 'Housing',
            title: 'Housing',
            accountNumber: 2,
            accountName: 'Main',
            currency: 'CHF',
            amount: -180000,
            varyingAmount: false,
            interval: 'monthly',
            anchor: 31,
            weekendShift: true,
            paused: false,
            nextDate: '2026-10-30',
        });
        expect(weekly).toMatchObject({
            categoryId: null,
            category: null,
            title: 'Pocket money',
            amount: 180000,
            anchor: 'Friday',
            paused: true,
        });
    });
});
