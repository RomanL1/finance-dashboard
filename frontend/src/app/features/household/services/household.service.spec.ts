import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { stubLocalStorage } from '../../../testing/local-storage';
import { HouseholdService } from './household.service';

const household = (id: string, name = 'Home') => ({
    id,
    name,
    role: 'owner',
    onboardingComplete: true,
    baseCurrency: 'CHF',
    createdAt: '2026-01-01T00:00:00.000Z',
});

const home = household('h1');
const cabin = household('h2', 'Cabin');

describe('HouseholdService', () => {
    let service: HouseholdService;
    let storage: Storage;
    let assign: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        storage = stubLocalStorage();
        assign = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                { provide: DOCUMENT, useValue: { location: { assign } } },
            ],
        });
        service = TestBed.inject(HouseholdService);
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('fetches the households once per session', async () => {
        const fetch = mockFetch([home, cabin]);

        await expect(service.getHouseholds()).resolves.toEqual([home, cabin]);
        await expect(service.getHousehold()).resolves.toEqual(home);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(new URL(requestOf(fetch).url).pathname).toBe('/api/households');
    });

    it('does not cache a failure', async () => {
        const fetch = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(
                Response.json({ message: 'down' }, { status: 500 }),
            )
            .mockResolvedValueOnce(Response.json([home]));

        await expect(service.getHousehold()).rejects.toBeDefined();
        await expect(service.getHousehold()).resolves.toEqual(home);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    describe('active household', () => {
        it('is the oldest membership when nothing is remembered', async () => {
            mockFetch([home, cabin]);
            await expect(service.getHousehold()).resolves.toEqual(home);
        });

        it('is the remembered one', async () => {
            storage.setItem('activeHouseholdId', 'h2');
            mockFetch([home, cabin]);
            await expect(service.getHousehold()).resolves.toEqual(cabin);
        });

        it('falls back to the oldest membership when the remembered one is gone', async () => {
            storage.setItem('activeHouseholdId', 'left');
            mockFetch([home, cabin]);
            await expect(service.getHousehold()).resolves.toEqual(home);
        });

        it('falls back to the oldest membership when storage is blocked', async () => {
            vi.stubGlobal('localStorage', {
                getItem: () => {
                    throw new Error('SecurityError');
                },
            });
            mockFetch([home, cabin]);
            await expect(service.getHousehold()).resolves.toEqual(home);
        });

        it('rejects for a user without a household', async () => {
            mockFetch([]);
            await expect(service.getHousehold()).rejects.toBeDefined();
        });
    });

    describe('getHouseholdOrNull', () => {
        it('resolves null for a user without a household', async () => {
            mockFetch([]);
            await expect(service.getHouseholdOrNull()).resolves.toBeNull();
        });

        it('resolves null instead of throwing when the request fails', async () => {
            mockFetch({ message: 'Unauthorized' }, 401);
            await expect(service.getHouseholdOrNull()).resolves.toBeNull();
        });

        it('resolves the active household and seeds the session cache', async () => {
            storage.setItem('activeHouseholdId', 'h2');
            const fetch = mockFetch([home, cabin]);

            await expect(service.getHouseholdOrNull()).resolves.toEqual(cabin);
            await expect(service.getHousehold()).resolves.toEqual(cabin);
            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('always fetches, so a guard sees a household joined since', async () => {
            const fetch = mockFetch([home]);

            await service.getHouseholdOrNull();
            await service.getHouseholdOrNull();
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });

    it('update sends the changes and replaces that household in the cache', async () => {
        mockFetch([home, cabin]);
        await service.getHouseholds();
        vi.restoreAllMocks();
        const renamed = { ...cabin, name: 'Hut' };
        const fetch = mockFetch(renamed);

        await expect(service.update('h2', { name: 'Hut' })).resolves.toEqual(
            renamed,
        );
        await expect(service.getHouseholds()).resolves.toEqual([home, renamed]);

        expect(fetch).toHaveBeenCalledTimes(1);
        const request = requestOf(fetch);
        expect(request.method).toBe('PATCH');
        expect(new URL(request.url).pathname).toBe('/api/households/h2');
        await expect(request.json()).resolves.toEqual({ name: 'Hut' });
    });

    describe('switchTo', () => {
        it('remembers the household and restarts the app at home', () => {
            service.switchTo('h2');

            expect(storage.getItem('activeHouseholdId')).toBe('h2');
            expect(assign).toHaveBeenCalledWith('/');
        });

        it('leaves a notice that is taken exactly once', () => {
            expect(service.takeSwitchNotice()).toBe(false);

            service.switchTo('h2');

            expect(service.takeSwitchNotice()).toBe(true);
            expect(service.takeSwitchNotice()).toBe(false);
        });

        it('still restarts when storage is blocked', () => {
            vi.stubGlobal('localStorage', {
                setItem: () => {
                    throw new Error('SecurityError');
                },
            });
            service.switchTo('h2');
            expect(assign).toHaveBeenCalledWith('/');
        });
    });

    describe('leaveIfRemoved', () => {
        it('restarts when the user is no longer in the household', async () => {
            mockFetch([cabin]);
            await service.leaveIfRemoved('h1');
            expect(assign).toHaveBeenCalledWith('/');
        });

        it('restarts when the user has no household left', async () => {
            mockFetch([]);
            await service.leaveIfRemoved('h1');
            expect(assign).toHaveBeenCalledWith('/');
        });

        it('stays when the user is still a member (the 403 was about the role)', async () => {
            mockFetch([home, cabin]);
            await service.leaveIfRemoved('h1');
            expect(assign).not.toHaveBeenCalled();
        });

        it('stays when the list cannot be loaded', async () => {
            mockFetch({ message: 'down' }, 500);
            await service.leaveIfRemoved('h1');
            expect(assign).not.toHaveBeenCalled();
        });
    });
});
