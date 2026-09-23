import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { StatsService } from './stats.service';

describe('StatsService', () => {
    afterEach(() => vi.restoreAllMocks());

    it('sends the range bounds as ISO instants', async () => {
        const stats = { currency: 'CHF', income: 1, expenses: 2, net: -1 };
        const fetch = mockFetch(stats);
        const from = new Date('2026-09-01T00:00:00.000Z');
        const to = new Date('2026-10-01T00:00:00.000Z');

        await expect(
            TestBed.inject(StatsService).get('h1', { from, to }),
        ).resolves.toEqual(stats);

        const url = new URL(requestOf(fetch).url);
        expect(url.pathname).toBe('/api/households/h1/transactions/stats');
        expect(url.searchParams.get('from')).toBe(from.toISOString());
        expect(url.searchParams.get('to')).toBe(to.toISOString());
    });
});
