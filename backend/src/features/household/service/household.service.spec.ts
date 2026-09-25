import { describe, expect, it, vi } from 'vitest';
import {
    ForbiddenError,
    NotFoundError,
    ValidationError,
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
        onboardingComplete: false,
        baseCurrency: 'CHF',
        createdAt: new Date('2026-01-01'),
    },
});

/** The repository methods HouseholdService calls. */
type RepoFake = Pick<
    HouseholdRepository,
    'findById' | 'findMembershipByUserId' | 'findMembership' | 'update'
>;

function makeRepo(overrides: Partial<RepoFake> = {}): RepoFake {
    return {
        findById: vi.fn<RepoFake['findById']>().mockResolvedValue(null),
        findMembershipByUserId: vi
            .fn<RepoFake['findMembershipByUserId']>()
            .mockResolvedValue(null),
        findMembership: vi
            .fn<RepoFake['findMembership']>()
            .mockResolvedValue(null),
        update: vi.fn<RepoFake['update']>((_id, changes) =>
            Promise.resolve({
                ...membership('owner').household,
                ...changes,
            }),
        ),
        ...overrides,
    };
}

function makeService(repo: RepoFake) {
    // The fake covers every method HouseholdService calls; the rest of the class is never touched.
    return new HouseholdService(repo as HouseholdRepository);
}

describe('HouseholdService', () => {
    it('getById returns the household when it exists', async () => {
        const repo = makeRepo({
            findById: vi.fn().mockResolvedValue(membership('owner').household),
        });
        await expect(makeService(repo).getById('h1')).resolves.toEqual(
            membership('owner').household,
        );
    });

    it('getById throws NotFoundError when household does not exist', async () => {
        const service = makeService(makeRepo());
        await expect(service.getById('h1')).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });

    it('throws NotFoundError when user has no household', async () => {
        const service = makeService(makeRepo());
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
        await expect(makeService(repo).getForUser('u1')).resolves.toEqual(
            membership('member'),
        );
    });

    it('hasHousehold reflects whether the user already belongs to one', async () => {
        await expect(makeService(makeRepo()).hasHousehold('u1')).resolves.toBe(
            false,
        );

        const repo = makeRepo({
            findMembershipByUserId: vi
                .fn()
                .mockResolvedValue(membership('owner')),
        });
        await expect(makeService(repo).hasHousehold('u1')).resolves.toBe(true);
    });

    it('assertMember returns membership when user belongs to household', async () => {
        const repo = makeRepo({
            findMembership: vi.fn().mockResolvedValue(membership('member')),
        });
        await expect(
            makeService(repo).assertMember('h1', 'u1'),
        ).resolves.toEqual(membership('member'));
    });

    it('assertMember throws ForbiddenError when user does not belong to household', async () => {
        const repo = makeRepo({
            findMembership: vi.fn().mockResolvedValue(null),
        });
        await expect(
            makeService(repo).assertMember('h1', 'u1'),
        ).rejects.toBeInstanceOf(ForbiddenError);
    });

    describe('update', () => {
        it('lets the owner change name and currency', async () => {
            const repo = makeRepo({
                findMembership: vi.fn().mockResolvedValue(membership('owner')),
            });
            const result = await makeService(repo).update('h1', 'u1', {
                name: '  Casa  ',
                baseCurrency: 'EUR',
            });
            expect(repo.update).toHaveBeenCalledWith('h1', {
                name: 'Casa',
                baseCurrency: 'EUR',
            });
            expect(result.household).toMatchObject({
                name: 'Casa',
                baseCurrency: 'EUR',
            });
            expect(result.role).toBe('owner');
        });

        it('rejects members', async () => {
            const repo = makeRepo({
                findMembership: vi.fn().mockResolvedValue(membership('member')),
            });
            await expect(
                makeService(repo).update('h1', 'u1', {
                    baseCurrency: 'EUR',
                }),
            ).rejects.toBeInstanceOf(ForbiddenError);
            expect(repo.update).not.toHaveBeenCalled();
        });

        it('rejects non-members', async () => {
            const repo = makeRepo();
            await expect(
                makeService(repo).update('h1', 'u1', { name: 'Casa' }),
            ).rejects.toBeInstanceOf(ForbiddenError);
            expect(repo.update).not.toHaveBeenCalled();
        });

        it('rejects a blank name', async () => {
            const repo = makeRepo({
                findMembership: vi.fn().mockResolvedValue(membership('owner')),
            });
            await expect(
                makeService(repo).update('h1', 'u1', { name: '   ' }),
            ).rejects.toBeInstanceOf(ValidationError);
            expect(repo.update).not.toHaveBeenCalled();
        });

        it('changes only the fields that are given', async () => {
            const repo = makeRepo({
                findMembership: vi.fn().mockResolvedValue(membership('owner')),
            });
            const result = await makeService(repo).update('h1', 'u1', {
                baseCurrency: 'USD',
            });
            expect(repo.update).toHaveBeenCalledWith('h1', {
                baseCurrency: 'USD',
            });
            expect(result.household).toMatchObject({
                name: 'Home',
                baseCurrency: 'USD',
            });
        });

        it('throws NotFoundError when the household vanished meanwhile', async () => {
            const repo = makeRepo({
                findMembership: vi.fn().mockResolvedValue(membership('owner')),
                update: vi.fn().mockResolvedValue(null),
            });
            await expect(
                makeService(repo).update('h1', 'u1', { name: 'Casa' }),
            ).rejects.toBeInstanceOf(NotFoundError);
        });

        it('is a no-op without changes', async () => {
            const repo = makeRepo({
                findMembership: vi.fn().mockResolvedValue(membership('owner')),
            });
            await expect(
                makeService(repo).update('h1', 'u1', {}),
            ).resolves.toEqual(membership('owner'));
            expect(repo.update).not.toHaveBeenCalled();
        });
    });
});
