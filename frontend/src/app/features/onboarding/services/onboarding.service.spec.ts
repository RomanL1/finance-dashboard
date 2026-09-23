import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { OnboardingService } from './onboarding.service';

const account = {
    description: 'Checking',
    type: 'checking' as const,
    currency: 'CHF' as const,
    initialValue: 0,
    startDate: '2026-01-01',
};

describe('OnboardingService', () => {
    let service: OnboardingService;

    beforeEach(() => {
        service = TestBed.inject(OnboardingService);
    });

    afterEach(() => vi.restoreAllMocks());

    it('loads the default categories', async () => {
        mockFetch([{ translateKey: 'MISC' }]);
        await expect(service.getDefaultCategories()).resolves.toEqual([
            { translateKey: 'MISC' },
        ]);
    });

    it('validates each step with its own payload', async () => {
        const fetch = mockFetch(null, 204);

        await service.validateHousehold('Home');
        await service.validateCategories(['Food']);
        await service.validateAccounts([account]);

        await expect(requestOf(fetch, 0).json()).resolves.toEqual({
            name: 'Home',
        });
        await expect(requestOf(fetch, 1).json()).resolves.toEqual({
            categoryNames: ['Food'],
        });
        await expect(requestOf(fetch, 2).json()).resolves.toEqual({
            accounts: [account],
        });
    });

    it('rejects a step the server refuses', async () => {
        mockFetch({ message: 'Category names must be unique' }, 400);
        await expect(
            service.validateCategories(['Food', 'food']),
        ).rejects.toEqual({ message: 'Category names must be unique' });
    });

    it('submits the whole household at once', async () => {
        const fetch = mockFetch({ id: 'h1', name: 'Home' });
        const dto = {
            name: 'Home',
            categoryNames: ['Food'],
            accounts: [account],
        };

        await expect(service.submit(dto)).resolves.toEqual({
            id: 'h1',
            name: 'Home',
        });
        expect(requestOf(fetch).method).toBe('POST');
        await expect(requestOf(fetch).json()).resolves.toEqual(dto);
    });
});
