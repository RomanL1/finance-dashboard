import { describe, expect, it, vi } from 'vitest';
import {
    ConflictError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import type { HouseholdService } from '../../household/service/household.service.js';
import type { OnboardingRepository } from '../repository/onboarding.repository.js';
import { OnboardingService } from './onboarding.service.js';

const input = {
    name: 'Home',
    categoryNames: ['Groceries', 'Housing'],
    accounts: [
        {
            description: 'Checking',
            currency: 'CHF',
            type: 'checking' as const,
            initialValue: 100000,
            startDate: new Date('2026-01-01'),
        },
    ],
};

function makeRepo(): Pick<OnboardingRepository, 'insertHousehold'> {
    return {
        insertHousehold: vi
            .fn<OnboardingRepository['insertHousehold']>()
            .mockResolvedValue(undefined),
    };
}

function makeHouseholds(
    hasHousehold = false,
): Pick<HouseholdService, 'hasHousehold'> {
    return {
        hasHousehold: vi
            .fn<HouseholdService['hasHousehold']>()
            .mockResolvedValue(hasHousehold),
    };
}

function makeService(
    repo: Pick<OnboardingRepository, 'insertHousehold'>,
    households = makeHouseholds(),
) {
    // The fakes cover every method OnboardingService calls; the rest of each class is never touched.
    return new OnboardingService(
        repo as OnboardingRepository,
        households as HouseholdService,
    );
}

describe('OnboardingService', () => {
    it('persists household, categories and accounts in one write', async () => {
        const repo = makeRepo();
        const service = makeService(repo);

        const household = await service.onboard('u1', input);

        expect(household).toMatchObject({
            name: 'Home',
            onboardingComplete: true,
            baseCurrency: 'CHF',
        });
        expect(repo.insertHousehold).toHaveBeenCalledTimes(1);

        const written = vi.mocked(repo.insertHousehold).mock.calls[0][0];
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
            type: 'checking' as const,
            initialValue: 100000,
        });
    });

    it('rejects accounts in different currencies', async () => {
        const repo = makeRepo();
        const service = makeService(repo);

        await expect(
            service.onboard('u1', {
                ...input,
                accounts: [
                    ...input.accounts,
                    { ...input.accounts[0], currency: 'EUR' },
                ],
            }),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(repo.insertHousehold).not.toHaveBeenCalled();
    });

    it('refuses a second household for the same user', async () => {
        const repo = makeRepo();
        const service = makeService(repo, makeHouseholds(true));

        await expect(service.onboard('u1', input)).rejects.toBeInstanceOf(
            ConflictError,
        );
        expect(repo.insertHousehold).not.toHaveBeenCalled();
    });

    it('rejects category names that only differ by case', async () => {
        const repo = makeRepo();
        const service = makeService(repo);

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
        const service = makeService(repo);

        expect(() =>
            service.validateCategoryNames(['Groceries', 'GROCERIES']),
        ).toThrow(ValidationError);
        expect(() =>
            service.validateCategoryNames(['Groceries', 'Housing']),
        ).not.toThrow();
    });

    it('needs at least one account', async () => {
        const repo = makeRepo();
        const service = makeService(repo);

        await expect(
            service.onboard('u1', { ...input, accounts: [] }),
        ).rejects.toThrow('Onboarding needs at least one account');
        expect(repo.insertHousehold).not.toHaveBeenCalled();
    });

    it('rejects an unsupported currency', async () => {
        const repo = makeRepo();
        const service = makeService(repo);

        await expect(
            service.onboard('u1', {
                ...input,
                accounts: [{ ...input.accounts[0], currency: 'JPY' }],
            }),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(repo.insertHousehold).not.toHaveBeenCalled();
    });

    it.each([
        ['a blank category name', { categoryNames: ['Groceries', '  '] }],
        [
            'a blank account description',
            { accounts: [{ ...input.accounts[0], description: ' ' }] },
        ],
    ])('rejects %s without writing anything', async (_case, patch) => {
        const repo = makeRepo();
        const service = makeService(repo);

        await expect(
            service.onboard('u1', { ...input, ...patch }),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(repo.insertHousehold).not.toHaveBeenCalled();
    });

    it('allows a household without categories', async () => {
        const repo = makeRepo();
        const service = makeService(repo);

        await service.onboard('u1', { ...input, categoryNames: [] });

        const written = vi.mocked(repo.insertHousehold).mock.calls[0][0];
        expect(written.categories).toEqual([]);
    });

    it('gives the household and every row its own id', async () => {
        const repo = makeRepo();
        const service = makeService(repo);

        await service.onboard('u1', input);

        const written = vi.mocked(repo.insertHousehold).mock.calls[0][0];
        const ids = [
            written.household.id,
            ...written.categories.map((c) => c.id),
            ...written.accounts.map((a) => a.id),
        ];
        expect(new Set(ids).size).toBe(ids.length);
    });
});
