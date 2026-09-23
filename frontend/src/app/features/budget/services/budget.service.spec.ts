import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { toMonthKey } from '../budget.types';
import { BudgetService } from './budget.service';

const limit = { id: 'b1', categoryId: 'c1', month: '2026-09', amount: 500 };

describe('BudgetService', () => {
    let service: BudgetService;

    beforeEach(() => {
        service = TestBed.inject(BudgetService);
    });

    afterEach(() => vi.restoreAllMocks());

    it('lists the limits of a month', async () => {
        const fetch = mockFetch([limit]);

        await expect(service.list('h1', '2026-09')).resolves.toEqual([limit]);
        const url = new URL(requestOf(fetch).url);
        expect(url.pathname).toBe('/api/households/h1/budgets');
        expect(url.searchParams.get('month')).toBe('2026-09');
    });

    it('sets a limit with the amount in the body and removes one', async () => {
        const fetch = mockFetch(limit);

        await service.set('h1', 'c1', '2026-09', 500);
        await service.remove('h1', 'c1', '2026-09');

        const set = requestOf(fetch, 0);
        expect(set.method).toBe('PUT');
        expect(new URL(set.url).pathname).toBe(
            '/api/households/h1/budgets/c1/2026-09',
        );
        await expect(set.json()).resolves.toEqual({ amount: 500 });
        expect(requestOf(fetch, 1).method).toBe('DELETE');
    });

    it('asks for the automatic take-over only when told to', async () => {
        const fetch = mockFetch({
            sourceMonth: null,
            budgets: [],
            skipped: false,
        });

        await service.copyPrevious('h1', '2026-09');
        await service.copyPrevious('h1', '2026-09', true);

        expect(new URL(requestOf(fetch, 0).url).search).toBe('');
        expect(new URL(requestOf(fetch, 1).url).searchParams.get('auto')).toBe(
            'true',
        );
    });

    describe('loadMonth', () => {
        const current = toMonthKey(new Date());

        it('returns existing limits without copying', async () => {
            const fetch = mockFetch([limit]);

            await expect(service.loadMonth('h1', current)).resolves.toEqual({
                budgets: [limit],
                inheritedFrom: null,
                emptied: false,
            });
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('leaves an empty month outside the take-over window empty', async () => {
            const fetch = mockFetch([]);

            await expect(service.loadMonth('h1', '2000-01')).resolves.toEqual({
                budgets: [],
                inheritedFrom: null,
                emptied: false,
            });
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('fills an empty current month from the previous limits', async () => {
            const fetch = vi
                .spyOn(globalThis, 'fetch')
                .mockResolvedValueOnce(Response.json([]))
                .mockResolvedValueOnce(
                    Response.json({
                        sourceMonth: '2026-08',
                        budgets: [limit],
                        skipped: false,
                    }),
                );

            await expect(service.loadMonth('h1', current)).resolves.toEqual({
                budgets: [limit],
                inheritedFrom: '2026-08',
                emptied: false,
            });
            const copy = new URL(requestOf(fetch, 1).url);
            expect(copy.pathname).toBe(
                `/api/households/h1/budgets/${current}/copy-previous`,
            );
            expect(copy.searchParams.get('auto')).toBe('true');
        });

        it('reports a month emptied on purpose', async () => {
            vi.spyOn(globalThis, 'fetch')
                .mockResolvedValueOnce(Response.json([]))
                .mockResolvedValueOnce(
                    Response.json({
                        sourceMonth: null,
                        budgets: [],
                        skipped: true,
                    }),
                );

            await expect(service.loadMonth('h1', current)).resolves.toEqual({
                budgets: [],
                inheritedFrom: null,
                emptied: true,
            });
        });
    });
});
