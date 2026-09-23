import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { AccountService } from './account.service';

const body = {
    description: 'Checking',
    type: 'checking' as const,
    currency: 'CHF' as const,
    startDate: '2026-01-01',
};

describe('AccountService', () => {
    let service: AccountService;

    beforeEach(() => {
        service = TestBed.inject(AccountService);
    });

    afterEach(() => vi.restoreAllMocks());

    it('lists, creates and updates accounts of the household', async () => {
        const fetch = mockFetch([]);

        await service.list('h1');
        await service.create('h1', { ...body, initialValue: 100 });
        await service.update('h1', 'a1', body);

        expect(
            [0, 1, 2].map((i) => {
                const request = requestOf(fetch, i);
                return `${request.method} ${new URL(request.url).pathname}`;
            }),
        ).toEqual([
            'GET /api/households/h1/accounts',
            'POST /api/households/h1/accounts',
            'PATCH /api/households/h1/accounts/a1',
        ]);
        await expect(requestOf(fetch, 2).json()).resolves.toEqual(body);
    });

    describe('delete', () => {
        it('is true once the account is gone', async () => {
            mockFetch(null, 204);
            await expect(service.delete('h1', 'a1')).resolves.toBe(true);
        });

        it('is false when the account has transactions', async () => {
            mockFetch({ message: 'archive it instead' }, 409);
            await expect(service.delete('h1', 'a1')).resolves.toBe(false);
        });

        it('rejects on any other failure', async () => {
            mockFetch({ message: 'not found' }, 404);
            await expect(service.delete('h1', 'a1')).rejects.toEqual({
                message: 'not found',
            });
        });
    });
});
