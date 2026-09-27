import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { stubLocalStorage } from '../../../testing/local-storage';
import { TransactionService } from './transaction.service';

const body = {
    type: 'expense' as const,
    amount: 1250,
    accountId: 'a1',
    categoryId: 'c1',
    title: null,
    description: null,
    date: '2026-09-15T08:30:00.000Z',
};

describe('TransactionService', () => {
    let service: TransactionService;

    beforeEach(() => {
        stubLocalStorage();
        service = TestBed.inject(TransactionService);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('lists a page with the filter as query params, leaving out unset ones', async () => {
        const fetch = mockFetch({ items: [], total: 0, page: 2, pageSize: 50 });

        await service.list('h1', { categoryId: 'none', page: 2 });
        await service.list('h1', { accountId: 'a1', page: 1 }, 5);

        const first = new URL(requestOf(fetch, 0).url);
        expect(first.pathname).toBe('/api/households/h1/transactions');
        expect(Object.fromEntries(first.searchParams)).toEqual({
            categoryId: 'none',
            page: '2',
        });
        expect(
            Object.fromEntries(new URL(requestOf(fetch, 1).url).searchParams),
        ).toEqual({ accountId: 'a1', page: '1', pageSize: '5' });
    });

    it('restricts to rows waiting for confirmation', async () => {
        const fetch = mockFetch({ items: [], total: 0, page: 1, pageSize: 50 });

        await service.list('h1', { needsConfirmation: true, page: 1 });

        expect(
            new URL(requestOf(fetch, 0).url).searchParams.get(
                'needsConfirmation',
            ),
        ).toBe('true');
    });

    it('narrows by date range', async () => {
        const fetch = mockFetch({ items: [], total: 0, page: 1, pageSize: 10 });

        await service.list('h1', { page: 1 }, 10, {
            from: new Date('2026-09-01T00:00:00.000Z'),
            before: new Date('2026-10-01T00:00:00.000Z'),
        });

        expect(
            Object.fromEntries(new URL(requestOf(fetch, 0).url).searchParams),
        ).toEqual({
            from: '2026-09-01T00:00:00.000Z',
            before: '2026-10-01T00:00:00.000Z',
            page: '1',
            pageSize: '10',
        });
    });

    it('confirms a transaction', async () => {
        const fetch = mockFetch({ id: 't1', needsConfirmation: false });

        await service.confirm('h1', 't1');

        const request = requestOf(fetch, 0);
        expect(request.method).toBe('POST');
        expect(new URL(request.url).pathname).toBe(
            '/api/households/h1/transactions/t1/confirm',
        );
    });

    it('remembers account and category of a created entry', async () => {
        mockFetch({ id: 't1' });

        expect(service.lastUsed()).toEqual({});
        await service.create('h1', body);

        expect(service.lastUsed()).toEqual({
            accountId: 'a1',
            categoryId: 'c1',
        });
    });

    it('remembers an uncategorized entry as such', async () => {
        mockFetch({ id: 't1' });

        await service.create('h1', { ...body, categoryId: undefined });

        expect(service.lastUsed()).toEqual({
            accountId: 'a1',
            categoryId: null,
        });
    });

    it('does not remember an entry the server refused', async () => {
        mockFetch({ message: 'Account not found' }, 404);

        await expect(service.create('h1', body)).rejects.toBeDefined();
        expect(service.lastUsed()).toEqual({});
    });

    it('leaves the last-used defaults alone on update', async () => {
        const fetch = mockFetch({ id: 't1' });

        await service.update('h1', 't1', body);
        await service.delete('h1', 't1');

        expect(service.lastUsed()).toEqual({});
        expect(requestOf(fetch, 0).method).toBe('PATCH');
        expect(new URL(requestOf(fetch, 0).url).pathname).toBe(
            '/api/households/h1/transactions/t1',
        );
        expect(requestOf(fetch, 1).method).toBe('DELETE');
    });

    it('ignores corrupt stored defaults', () => {
        localStorage.setItem('transaction-last-used', '{oops');
        expect(service.lastUsed()).toEqual({});
    });
});
