import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import type { SaveRecurringTransactionDto } from '../recurring.types';
import { RecurringService } from './recurring.service';

const body: SaveRecurringTransactionDto = {
    type: 'expense',
    amount: 180000,
    accountId: 'a1',
    categoryId: null,
    title: 'Rent',
    interval: 'monthly',
    dayOfMonth: 31,
    startDate: '2026-01-31',
};

describe('RecurringService', () => {
    let service: RecurringService;

    beforeEach(() => {
        service = TestBed.inject(RecurringService);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('addresses every endpoint under the household', async () => {
        const fetch = mockFetch({ id: 'r1' });

        await service.list('h1');
        await service.create('h1', body);
        await service.update('h1', 'r1', body);
        await service.setPaused('h1', 'r1', true);
        await service.setPaused('h1', 'r1', false);

        const calls = [0, 1, 2, 3, 4].map((i) => {
            const request = requestOf(fetch, i);
            return `${request.method} ${new URL(request.url).pathname}`;
        });
        const base = '/api/households/h1/recurring-transactions';
        expect(calls).toEqual([
            `GET ${base}`,
            `POST ${base}`,
            `PATCH ${base}/r1`,
            `POST ${base}/r1/pause`,
            `POST ${base}/r1/resume`,
        ]);
    });

    it('deletes a rule', async () => {
        const fetch = mockFetch(null, 204);

        await service.delete('h1', 'r1');

        expect(requestOf(fetch, 0).method).toBe('DELETE');
    });
});
