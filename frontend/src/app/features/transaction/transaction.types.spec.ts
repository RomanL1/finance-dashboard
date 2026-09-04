import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import type { AccountDto, CategoryDto, TransactionDto } from '../../core/api';
import { toTransactionGroups } from './transaction.types';

registerLocaleData(localeDe);

/** Friday 2026-09-04 12:00 local time. */
const NOW = new Date(2026, 8, 4, 12, 0);

const ACCOUNTS: AccountDto[] = [
    {
        id: 'a1',
        householdId: 'h',
        description: 'Main',
        currency: 'CHF',
        initialValue: 0,
        amount: 0,
        startDate: '',
        createdAt: '',
    },
];
const CATEGORIES: CategoryDto[] = [
    { id: 'c1', name: 'Groceries', createdAt: '' },
];

function tx(
    id: string,
    date: Date,
    overrides: Partial<TransactionDto> = {},
): TransactionDto {
    return {
        id,
        accountId: 'a1',
        categoryId: 'c1',
        type: 'expense',
        amount: 100,
        title: id,
        description: null,
        date: date.toISOString(),
        createdAt: date.toISOString(),
        ...overrides,
    };
}

/** API order: newest first. */
function byDateDesc(list: TransactionDto[]): TransactionDto[] {
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
}

describe('toTransactionGroups', () => {
    it('resolves names and signs expenses negative', () => {
        const [group] = toTransactionGroups(
            [
                tx('t1', new Date(2026, 8, 4, 9, 30), { amount: 1250 }),
                tx('t2', new Date(2026, 8, 4, 8, 0), {
                    categoryId: 'missing',
                    type: 'income',
                    amount: 500000,
                }),
            ],
            ACCOUNTS,
            CATEGORIES,
            NOW,
            'en',
        );
        expect(group.rows[0]).toEqual({
            id: 't1',
            date: new Date(2026, 8, 4, 9, 30).toISOString(),
            when: '09:30',
            category: 'Groceries',
            title: 't1',
            currency: 'CHF',
            amount: -1250,
        });
        expect(group.rows[1].amount).toBe(500000);
        expect(group.rows[1].category).toBeNull();
    });

    it('falls back to the category name when the title is missing', () => {
        const [group] = toTransactionGroups(
            [
                tx('t1', NOW, { title: null }),
                tx('t2', NOW, { title: null, categoryId: null }),
            ],
            [],
            CATEGORIES,
            NOW,
            'en',
        );
        expect(group.rows[0].title).toBe('Groceries');
        expect(group.rows[1].title).toBeNull();
        expect(group.rows[1].category).toBeNull();
    });

    it('buckets by recency with group-specific formats', () => {
        const groups = toTransactionGroups(
            byDateDesc([
                tx('tomorrow', new Date(2026, 8, 5, 0, 0)),
                tx('later-today', new Date(2026, 8, 4, 23, 59)),
                tx('today-start', new Date(2026, 8, 4, 0, 0)),
                tx('monday', new Date(2026, 7, 31, 0, 0)),
                tx('sunday', new Date(2026, 7, 30, 23, 59)),
                tx('jan-1', new Date(2026, 0, 1, 0, 0)),
                tx('dec-31', new Date(2025, 11, 31, 23, 59)),
                tx('old', new Date(2024, 5, 15, 10, 0)),
            ]),
            ACCOUNTS,
            CATEGORIES,
            NOW,
            'en',
        );
        expect(
            groups.map((g) => [
                g.kind === 'past' ? g.year : g.kind,
                g.rows.map((r) => `${r.id}=${r.when}`),
            ]),
        ).toEqual([
            ['today', ['later-today=23:59', 'today-start=00:00']],
            ['upcoming', ['tomorrow=05.09. 00:00']],
            ['week', ['monday=Mon 00:00']],
            ['year', ['sunday=30.08. 23:59', 'jan-1=01.01. 00:00']],
            [2025, ['dec-31=31.12. 23:59']],
            [2024, ['old=15.06. 10:00']],
        ]);
    });

    it('sorts upcoming ascending and omits empty groups', () => {
        const groups = toTransactionGroups(
            byDateDesc([
                tx('in-2-days', new Date(2026, 8, 6, 10, 0)),
                tx('in-1-day', new Date(2026, 8, 5, 10, 0)),
            ]),
            ACCOUNTS,
            CATEGORIES,
            NOW,
            'en',
        );
        expect(groups).toHaveLength(1);
        expect(groups[0].kind).toBe('upcoming');
        expect(groups[0].rows.map((r) => r.id)).toEqual([
            'in-1-day',
            'in-2-days',
        ]);
    });

    it('localizes weekday names', () => {
        const [group] = toTransactionGroups(
            [tx('t', new Date(2026, 8, 1, 8, 0))],
            ACCOUNTS,
            CATEGORIES,
            NOW,
            'de',
        );
        expect(group.rows[0].when).toBe('Di. 08:00');
    });
});
