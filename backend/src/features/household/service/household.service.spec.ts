import { ForbiddenError, NotFoundError } from '../../../shared/kernel/index.js';
import type { HouseholdMembership } from '../model/household.js';
import type { HouseholdRepository } from '../repository/household.repository.js';
import { HouseholdService } from './household.service.js';

const membership = (
    role: HouseholdMembership['role'],
): HouseholdMembership => ({
    role,
    household: {
        id: 'h1',
        name: 'Home',
        currency: 'CHF',
        onboardingComplete: false,
        createdAt: new Date('2026-01-01'),
    },
});

function makeRepo(overrides: Partial<HouseholdRepository> = {}) {
    return {
        findById: vi.fn().mockResolvedValue(null),
        findMembershipByUserId: vi.fn().mockResolvedValue(null),
        findMembership: vi.fn().mockResolvedValue(null),
        ...overrides,
    } as unknown as HouseholdRepository;
}

describe('HouseholdService', () => {
    it('getById returns the household when it exists', async () => {
        const repo = makeRepo({
            findById: vi.fn().mockResolvedValue(membership('owner').household),
        });
        await expect(new HouseholdService(repo).getById('h1')).resolves.toEqual(
            membership('owner').household,
        );
    });

    it('getById throws NotFoundError when household does not exist', async () => {
        const service = new HouseholdService(makeRepo());
        await expect(service.getById('h1')).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });

    it('throws NotFoundError when user has no household', async () => {
        const service = new HouseholdService(makeRepo());
        await expect(service.getForUser('u1')).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });

    it('returns the membership for a household member', async () => {
        const repo = makeRepo({
            findMembershipByUserId: vi
                .fn()
                .mockResolvedValue(membership('member')),
        });
        await expect(
            new HouseholdService(repo).getForUser('u1'),
        ).resolves.toEqual(membership('member'));
    });

    it('hasHousehold reflects whether the user already belongs to one', async () => {
        await expect(
            new HouseholdService(makeRepo()).hasHousehold('u1'),
        ).resolves.toBe(false);

        const repo = makeRepo({
            findMembershipByUserId: vi
                .fn()
                .mockResolvedValue(membership('owner')),
        });
        await expect(
            new HouseholdService(repo).hasHousehold('u1'),
        ).resolves.toBe(true);
    });

    it('assertMember returns membership when user belongs to household', async () => {
        const repo = makeRepo({
            findMembership: vi.fn().mockResolvedValue(membership('member')),
        });
        await expect(
            new HouseholdService(repo).assertMember('h1', 'u1'),
        ).resolves.toEqual(membership('member'));
    });

    it('assertMember throws ForbiddenError when user does not belong to household', async () => {
        const repo = makeRepo({
            findMembership: vi.fn().mockResolvedValue(null),
        });
        await expect(
            new HouseholdService(repo).assertMember('h1', 'u1'),
        ).rejects.toBeInstanceOf(ForbiddenError);
    });
});
