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
        timeZone: 'Europe/Zurich',
        createdAt: new Date('2026-01-01'),
    },
});

type RepoFake = Pick<
    HouseholdRepository,
    | 'findById'
    | 'findMembershipsByUserId'
    | 'findMembership'
    | 'findMembers'
    | 'removeMember'
    | 'update'
>;

function makeRepo(overrides: Partial<RepoFake> = {}): RepoFake {
    return {
        findById: vi.fn<RepoFake['findById']>().mockResolvedValue(null),
        findMembershipsByUserId: vi
            .fn<RepoFake['findMembershipsByUserId']>()
            .mockResolvedValue([]),
        findMembers: vi.fn<RepoFake['findMembers']>().mockResolvedValue([]),
        removeMember: vi.fn<RepoFake['removeMember']>().mockResolvedValue(true),
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

    it('lists no household before onboarding', async () => {
        await expect(
            makeService(makeRepo()).listForUser('u1'),
        ).resolves.toEqual([]);
    });

    it('lists every household of the user in repository order', async () => {
        const repo = makeRepo({
            findMembershipsByUserId: vi
                .fn()
                .mockResolvedValue([membership('member'), membership('owner')]),
        });
        await expect(makeService(repo).listForUser('u1')).resolves.toEqual([
            membership('member'),
            membership('owner'),
        ]);
    });

    describe('removeMember', () => {
        const owned = () =>
            makeRepo({
                findMembership: vi.fn().mockResolvedValue(membership('owner')),
            });

        it('lets the owner remove a member', async () => {
            const repo = owned();
            await makeService(repo).removeMember('h1', 'owner', 'u2');
            expect(repo.removeMember).toHaveBeenCalledWith('h1', 'u2');
        });

        it('rejects members', async () => {
            const repo = makeRepo({
                findMembership: vi.fn().mockResolvedValue(membership('member')),
            });
            await expect(
                makeService(repo).removeMember('h1', 'u1', 'u2'),
            ).rejects.toBeInstanceOf(ForbiddenError);
            expect(repo.removeMember).not.toHaveBeenCalled();
        });

        it('rejects non-members', async () => {
            const repo = makeRepo();
            await expect(
                makeService(repo).removeMember('h1', 'u1', 'u2'),
            ).rejects.toBeInstanceOf(ForbiddenError);
            expect(repo.removeMember).not.toHaveBeenCalled();
        });

        it('does not let the owner remove themselves', async () => {
            const repo = owned();
            await expect(
                makeService(repo).removeMember('h1', 'owner', 'owner'),
            ).rejects.toBeInstanceOf(ValidationError);
            expect(repo.removeMember).not.toHaveBeenCalled();
        });

        it('throws NotFoundError for a user who is not a member', async () => {
            const repo = owned();
            vi.mocked(repo.removeMember).mockResolvedValue(false);
            await expect(
                makeService(repo).removeMember('h1', 'owner', 'ghost'),
            ).rejects.toBeInstanceOf(NotFoundError);
        });
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

        it('changes the time zone', async () => {
            const repo = makeRepo({
                findMembership: vi.fn().mockResolvedValue(membership('owner')),
            });
            await makeService(repo).update('h1', 'u1', {
                timeZone: 'America/New_York',
            });
            expect(repo.update).toHaveBeenCalledWith('h1', {
                timeZone: 'America/New_York',
            });
        });

        it('rejects an unknown time zone', async () => {
            const repo = makeRepo({
                findMembership: vi.fn().mockResolvedValue(membership('owner')),
            });
            await expect(
                makeService(repo).update('h1', 'u1', { timeZone: 'Mars/Base' }),
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
