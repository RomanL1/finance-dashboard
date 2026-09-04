import { toTransactionRows } from './transaction.types';

describe('toTransactionRows', () => {
    it('resolves names and signs expenses negative', () => {
        const rows = toTransactionRows(
            [
                {
                    id: 't1',
                    accountId: 'a1',
                    categoryId: 'c1',
                    type: 'expense',
                    amount: 1250,
                    title: 'Milk',
                    description: null,
                    date: '2026-01-15T00:00:00.000Z',
                    createdAt: '2026-01-15T00:00:00.000Z',
                },
                {
                    id: 't2',
                    accountId: 'a1',
                    categoryId: 'missing',
                    type: 'income',
                    amount: 500000,
                    title: 'Salary',
                    description: null,
                    date: '2026-01-01T00:00:00.000Z',
                    createdAt: '2026-01-01T00:00:00.000Z',
                },
            ],
            [
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
            ],
            [{ id: 'c1', name: 'Groceries', createdAt: '' }],
        );
        expect(rows[0]).toEqual({
            id: 't1',
            date: '2026-01-15T00:00:00.000Z',
            category: 'Groceries',
            title: 'Milk',
            currency: 'CHF',
            amount: -1250,
        });
        expect(rows[1].amount).toBe(500000);
        expect(rows[1].category).toBeNull();
    });

    it('falls back to the category name when the title is missing', () => {
        const rows = toTransactionRows(
            [
                {
                    id: 't1',
                    accountId: 'a1',
                    categoryId: 'c1',
                    type: 'expense',
                    amount: 100,
                    title: null,
                    description: null,
                    date: '',
                    createdAt: '',
                },
                {
                    id: 't2',
                    accountId: 'a1',
                    categoryId: null,
                    type: 'expense',
                    amount: 100,
                    title: null,
                    description: null,
                    date: '',
                    createdAt: '',
                },
            ],
            [],
            [{ id: 'c1', name: 'Groceries', createdAt: '' }],
        );
        expect(rows[0].title).toBe('Groceries');
        expect(rows[1].title).toBeNull();
        expect(rows[1].category).toBeNull();
    });
});
