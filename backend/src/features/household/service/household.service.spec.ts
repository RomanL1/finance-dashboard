import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from '../../../shared/kernel/index.js';
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
        createdAt: new Date('2026-01-01'),
    },
});

function makeRepo(overrides: Partial<HouseholdRepository> = {}) {
    return {
        findMembershipByUserId: vi.fn().mockResolvedValue(null),
        findMembership: vi.fn().mockResolvedValue(null),
        insert: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    } as unknown as HouseholdRepository;
}

describe('HouseholdService', () => {
    it('throws NotFoundError when user has no household', async () => {
        const service = new HouseholdService(makeRepo());
        await expect(service.getForUser('u1')).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });

    it('creates a household and registers the owner', async () => {
        const repo = makeRepo();
        const service = new HouseholdService(repo);
        const created = await service.createForOwner('u1', 'Home');
        expect(created.name).toBe('Home');
        expect(created.currency).toBe('CHF');
        expect(repo.insert).toHaveBeenCalledWith(created, 'u1');
    });

    it('refuses a second household for the same user', async () => {
        const repo = makeRepo({
            findMembershipByUserId: vi
                .fn()
                .mockResolvedValue(membership('owner')),
        });
        await expect(
            new HouseholdService(repo).createForOwner('u1', 'Other'),
        ).rejects.toBeInstanceOf(ConflictError);
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
