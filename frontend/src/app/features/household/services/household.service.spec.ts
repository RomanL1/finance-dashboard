import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { HouseholdService } from './household.service';

const household = {
    id: 'h1',
    name: 'Home',
    role: 'owner',
    onboardingComplete: true,
    baseCurrency: 'CHF',
    createdAt: '2026-01-01T00:00:00.000Z',
};

describe('HouseholdService', () => {
    let service: HouseholdService;

    beforeEach(() => {
        service = TestBed.inject(HouseholdService);
    });

    afterEach(() => vi.restoreAllMocks());

    it('fetches the household once per session', async () => {
        const fetch = mockFetch(household);

        await expect(service.getHousehold()).resolves.toEqual(household);
        await expect(service.getHousehold()).resolves.toEqual(household);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('does not cache a failure', async () => {
        const fetch = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(
                Response.json({ message: 'down' }, { status: 500 }),
            )
            .mockResolvedValueOnce(Response.json(household));

        await expect(service.getHousehold()).rejects.toBeDefined();
        await expect(service.getHousehold()).resolves.toEqual(household);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('resolves null instead of throwing when there is no household yet', async () => {
        mockFetch({ message: 'Household not found' }, 404);

        await expect(service.getHouseholdOrNull()).resolves.toBeNull();
    });

    it('update sends the changes and replaces the cached household', async () => {
        const renamed = { ...household, name: 'Casa' };
        const fetch = mockFetch(renamed);

        await expect(service.update('h1', { name: 'Casa' })).resolves.toEqual(
            renamed,
        );
        await expect(service.getHousehold()).resolves.toEqual(renamed);

        expect(fetch).toHaveBeenCalledTimes(1);
        const request = requestOf(fetch);
        expect(request.method).toBe('PATCH');
        expect(new URL(request.url).pathname).toBe('/api/households/h1');
        await expect(request.json()).resolves.toEqual({ name: 'Casa' });
    });
});
