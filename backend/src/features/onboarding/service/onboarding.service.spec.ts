import {
    ConflictError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import type { HouseholdService } from '../../household/service/household.service.js';
import type {
    NewHousehold,
    OnboardingRepository,
} from '../repository/onboarding.repository.js';
import { OnboardingService } from './onboarding.service.js';

const input = {
    name: 'Home',
    categoryNames: ['Groceries', 'Housing'],
    accounts: [
        {
            description: 'Checking',
            currency: 'CHF',
            initialValue: 100000,
            startDate: new Date('2026-01-01'),
        },
    ],
};

function makeRepo(overrides: Partial<OnboardingRepository> = {}) {
    return {
        insertHousehold: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    } as unknown as OnboardingRepository;
}

function makeHouseholds(hasHousehold = false) {
    return {
        hasHousehold: vi.fn().mockResolvedValue(hasHousehold),
    } as unknown as HouseholdService;
}

describe('OnboardingService', () => {
    it('persists household, categories and accounts in one write', async () => {
        const repo = makeRepo();
        const service = new OnboardingService(repo, makeHouseholds());

        const household = await service.onboard('u1', input);

        expect(household).toMatchObject({
            name: 'Home',
            onboardingComplete: true,
        });
        expect(repo.insertHousehold).toHaveBeenCalledTimes(1);

        const written = vi.mocked(repo.insertHousehold).mock
            .calls[0][0] as NewHousehold;
        expect(written.household).toBe(household);
        expect(written.ownerUserId).toBe('u1');
        expect(written.categories.map((c) => c.name)).toEqual([
            'Groceries',
            'Housing',
        ]);
        expect(written.accounts).toHaveLength(1);
        expect(written.accounts[0]).toMatchObject({
            description: 'Checking',
            currency: 'CHF',
            initialValue: 100000,
            amount: 100000,
        });
    });

    it('refuses a second household for the same user', async () => {
        const repo = makeRepo();
        const service = new OnboardingService(repo, makeHouseholds(true));

        await expect(service.onboard('u1', input)).rejects.toBeInstanceOf(
            ConflictError,
        );
        expect(repo.insertHousehold).not.toHaveBeenCalled();
    });

    it('rejects category names that only differ by case', async () => {
        const repo = makeRepo();
        const service = new OnboardingService(repo, makeHouseholds());

        await expect(
            service.onboard('u1', {
                ...input,
                categoryNames: ['Groceries', 'groceries'],
            }),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(repo.insertHousehold).not.toHaveBeenCalled();
    });

    it('validateCategoryNames rejects duplicates without writing anything', () => {
        const repo = makeRepo();
        const service = new OnboardingService(repo, makeHouseholds());

        expect(() =>
            service.validateCategoryNames(['Groceries', 'GROCERIES']),
        ).toThrow(ValidationError);
        expect(() =>
            service.validateCategoryNames(['Groceries', 'Housing']),
        ).not.toThrow();
    });
});
