import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
    afterEach(() => vi.restoreAllMocks());

    it('sends the range bounds as ISO instants', async () => {
        const stats = { currency: 'CHF', categories: [] };
        const fetch = mockFetch(stats);
        const from = new Date('2026-09-01T00:00:00.000Z');
        const to = new Date('2026-10-01T00:00:00.000Z');

        await expect(
            TestBed.inject(AnalyticsService).getCategoryStats('h1', {
                from,
                to,
            }),
        ).resolves.toEqual(stats);

        const url = new URL(requestOf(fetch).url);
        expect(url.pathname).toBe(
            '/api/households/h1/transactions/stats/categories',
        );
        expect(url.searchParams.get('from')).toBe(from.toISOString());
        expect(url.searchParams.get('to')).toBe(to.toISOString());
    });
});
