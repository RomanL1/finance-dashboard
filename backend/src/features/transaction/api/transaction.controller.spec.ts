import { describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../model/transaction.js';
import type { TransactionService } from '../service/transaction.service.js';
import { TransactionController } from './transaction.controller.js';

const saved: Transaction = {
    id: 'tx-1',
    accountId: 'acc-1',
    categoryId: 'cat-1',
    type: 'expense',
    amount: 1250,
    title: 'Groceries',
    description: null,
    date: new Date('2026-09-15T08:30:00.000Z'),
    createdAt: new Date('2026-09-15T09:00:00.000Z'),
};

const stats = { currency: 'CHF', income: 0, expenses: 0, net: 0 };

function makeController() {
    const service: Pick<
        TransactionService,
        'getPage' | 'getStats' | 'getCategoryStats' | 'create' | 'update'
    > = {
        getPage: vi.fn<TransactionService['getPage']>().mockResolvedValue({
            items: [],
            total: 0,
            page: 1,
            pageSize: 50,
        }),
        getStats: vi
            .fn<TransactionService['getStats']>()
            .mockResolvedValue(stats),
        getCategoryStats: vi
            .fn<TransactionService['getCategoryStats']>()
            .mockResolvedValue({ currency: 'CHF', categories: [] }),
        create: vi.fn<TransactionService['create']>().mockResolvedValue(saved),
        update: vi.fn<TransactionService['update']>().mockResolvedValue(saved),
    };
    return {
        controller: new TransactionController(service as TransactionService),
        service,
    };
}

const body = {
    accountId: 'acc-1',
    categoryId: 'cat-1',
    type: 'expense' as const,
    amount: 1250,
    title: 'Groceries',
    description: null,
    date: '2026-09-15T08:30:00.000Z',
};

describe('TransactionController', () => {
    it('reads the uncategorized sentinel as a null category filter', async () => {
        const { controller, service } = makeController();

        await controller.getTransactions('h-1', {
            accountId: 'acc-1',
            categoryId: 'none',
        });

        expect(service.getPage).toHaveBeenCalledWith(
            'h-1',
            { accountId: 'acc-1', categoryId: null },
            1,
            undefined,
        );
    });

    it('passes a category id, page and page size through', async () => {
        const { controller, service } = makeController();

        await controller.getTransactions('h-1', {
            categoryId: 'cat-1',
            page: 3,
            pageSize: 10,
        });

        expect(service.getPage).toHaveBeenCalledWith(
            'h-1',
            { accountId: undefined, categoryId: 'cat-1' },
            3,
            10,
        );
    });

    it.each(['getStats', 'getCategoryStats'] as const)(
        '%s parses the range bounds',
        async (method) => {
            const { controller, service } = makeController();

            await controller[method]('h-1', {
                from: '2026-09-01T00:00:00.000Z',
                to: '2026-10-01T00:00:00.000Z',
            });

            expect(service[method]).toHaveBeenCalledWith('h-1', {
                from: new Date('2026-09-01T00:00:00.000Z'),
                to: new Date('2026-10-01T00:00:00.000Z'),
            });
        },
    );

    it('parses the date on create and update and returns the DTO', async () => {
        const { controller, service } = makeController();
        const input = { ...body, date: new Date(body.date) };

        const created = await controller.createTransaction('h-1', body);
        await controller.updateTransaction('h-1', 'tx-1', body);

        expect(service.create).toHaveBeenCalledWith('h-1', input);
        expect(service.update).toHaveBeenCalledWith('h-1', 'tx-1', input);
        expect(created.date).toBe('2026-09-15T08:30:00.000Z');
    });
});
