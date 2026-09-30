import { describe, expect, it, vi } from 'vitest';
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from '../../../shared/kernel/index.js';
import type { HouseholdMembership } from '../../household/model/household.js';
import type { HouseholdRepository } from '../../household/repository/household.repository.js';
import type { HouseholdService } from '../../household/service/household.service.js';
import {
    hashInvitationToken,
    MAX_OPEN_INVITATIONS,
    type Invitation,
} from '../model/invitation.js';
import type { InvitationRepository } from '../repository/invitation.repository.js';
import { InvitationService } from './invitation.service.js';

const NOW = new Date('2026-09-30T10:00:00.000Z');

const membership = (
    role: HouseholdMembership['role'],
): HouseholdMembership => ({
    role,
    household: {
        id: 'h1',
        name: 'Home',
        onboardingComplete: true,
        baseCurrency: 'CHF',
        timeZone: 'Europe/Zurich',
        createdAt: new Date('2026-01-01'),
    },
});

const invitation = (id: string): Invitation => ({
    id,
    householdId: 'h1',
    note: null,
    expiresAt: new Date('2026-10-01T09:00:00.000Z'),
    createdAt: new Date('2026-09-30T09:00:00.000Z'),
});

const found = { householdId: 'h1', householdName: 'Home', ownerName: 'Olga' };

function setup({
    owner = true,
    open = [] as Invitation[],
    valid = true,
    alreadyMember = false,
    consumed = true,
} = {}) {
    const invitations = {
        insert: vi.fn<InvitationRepository['insert']>(),
        findOpen: vi
            .fn<InvitationRepository['findOpen']>()
            .mockResolvedValue(open),
        deleteExpired: vi.fn<InvitationRepository['deleteExpired']>(),
        delete: vi.fn<InvitationRepository['delete']>().mockResolvedValue(true),
        findValidByTokenHash: vi
            .fn<InvitationRepository['findValidByTokenHash']>()
            .mockResolvedValue(valid ? found : null),
        consume: vi
            .fn<InvitationRepository['consume']>()
            .mockResolvedValue(consumed ? 'h1' : null),
    };
    const households = {
        assertOwner: vi.fn<HouseholdService['assertOwner']>(() =>
            owner
                ? Promise.resolve(membership('owner'))
                : Promise.reject(new ForbiddenError()),
        ),
        assertMember: vi
            .fn<HouseholdService['assertMember']>()
            .mockResolvedValue(membership('member')),
    };
    const members = {
        findMembership: vi
            .fn<HouseholdRepository['findMembership']>()
            .mockResolvedValue(alreadyMember ? membership('member') : null),
        addMember: vi.fn<HouseholdRepository['addMember']>(),
    };
    const service = new InvitationService(
        invitations as unknown as InvitationRepository,
        households as unknown as HouseholdService,
        members as unknown as HouseholdRepository,
        { now: () => NOW },
    );
    return { service, invitations, households, members };
}

describe('InvitationService', () => {
    describe('create', () => {
        it('stores only the hash of the token and expires after 24 hours', async () => {
            const { service, invitations } = setup();

            const created = await service.create('h1', 'owner', '  For Anna ');

            expect(created.note).toBe('For Anna');
            expect(created.expiresAt).toEqual(
                new Date('2026-10-01T10:00:00.000Z'),
            );
            const [stored, tokenHash] = invitations.insert.mock.calls[0];
            expect(tokenHash).toBe(hashInvitationToken(created.token));
            expect(tokenHash).not.toBe(created.token);
            expect(stored).not.toHaveProperty('token');
        });

        it('gives every invitation its own token', async () => {
            const { service } = setup();
            const first = await service.create('h1', 'owner');
            const second = await service.create('h1', 'owner');
            expect(first.token).not.toBe(second.token);
        });

        it('stores a blank note as none', async () => {
            const { service } = setup();
            await expect(
                service.create('h1', 'owner', '   '),
            ).resolves.toMatchObject({ note: null });
        });

        it('rejects members', async () => {
            const { service, invitations } = setup({ owner: false });
            await expect(service.create('h1', 'u2')).rejects.toBeInstanceOf(
                ForbiddenError,
            );
            expect(invitations.insert).not.toHaveBeenCalled();
        });

        it('allows the tenth open invitation and refuses the eleventh', async () => {
            const nine = Array.from(
                { length: MAX_OPEN_INVITATIONS - 1 },
                (_, i) => invitation(`i${i}`),
            );
            await expect(
                setup({ open: nine }).service.create('h1', 'owner'),
            ).resolves.toBeDefined();

            const full = setup({ open: [...nine, invitation('i9')] });
            await expect(
                full.service.create('h1', 'owner'),
            ).rejects.toBeInstanceOf(ConflictError);
            expect(full.invitations.insert).not.toHaveBeenCalled();
        });
    });

    describe('listOpen', () => {
        it('purges expired invitations before listing', async () => {
            const { service, invitations } = setup({
                open: [invitation('i1')],
            });
            await expect(service.listOpen('h1', 'owner')).resolves.toEqual([
                invitation('i1'),
            ]);
            expect(invitations.deleteExpired).toHaveBeenCalledWith('h1', NOW);
        });

        it('rejects members', async () => {
            const { service, invitations } = setup({ owner: false });
            await expect(service.listOpen('h1', 'u2')).rejects.toBeInstanceOf(
                ForbiddenError,
            );
            expect(invitations.findOpen).not.toHaveBeenCalled();
        });
    });

    describe('revoke', () => {
        it('deletes the invitation of that household', async () => {
            const { service, invitations } = setup();
            await service.revoke('h1', 'owner', 'i1');
            expect(invitations.delete).toHaveBeenCalledWith('h1', 'i1');
        });

        it('rejects members', async () => {
            const { service, invitations } = setup({ owner: false });
            await expect(
                service.revoke('h1', 'u2', 'i1'),
            ).rejects.toBeInstanceOf(ForbiddenError);
            expect(invitations.delete).not.toHaveBeenCalled();
        });

        it('throws NotFoundError for an unknown invitation', async () => {
            const { service, invitations } = setup();
            invitations.delete.mockResolvedValue(false);
            await expect(
                service.revoke('h1', 'owner', 'gone'),
            ).rejects.toBeInstanceOf(NotFoundError);
        });
    });

    describe('preview', () => {
        it('shows household and owner, looked up by the token hash', async () => {
            const { service, invitations } = setup();
            await expect(service.preview('secret')).resolves.toEqual({
                householdName: 'Home',
                ownerName: 'Olga',
            });
            expect(invitations.findValidByTokenHash).toHaveBeenCalledWith(
                hashInvitationToken('secret'),
                NOW,
            );
        });

        it('throws NotFoundError for a link that is not valid', async () => {
            const { service } = setup({ valid: false });
            await expect(service.preview('secret')).rejects.toBeInstanceOf(
                NotFoundError,
            );
        });
    });

    describe('accept', () => {
        it('uses the link up and adds the user as member', async () => {
            const { service, invitations, members } = setup();
            await expect(service.accept('secret', 'u2')).resolves.toEqual(
                membership('member'),
            );
            expect(invitations.consume).toHaveBeenCalledWith(
                hashInvitationToken('secret'),
                NOW,
            );
            expect(members.addMember).toHaveBeenCalledWith('h1', 'u2');
        });

        it('keeps the link when the user is already a member', async () => {
            const { service, invitations, members } = setup({
                alreadyMember: true,
            });
            await expect(service.accept('secret', 'u2')).resolves.toEqual(
                membership('member'),
            );
            expect(invitations.consume).not.toHaveBeenCalled();
            expect(members.addMember).not.toHaveBeenCalled();
        });

        it('throws NotFoundError for a link that is not valid', async () => {
            const { service, members } = setup({ valid: false });
            await expect(service.accept('secret', 'u2')).rejects.toBeInstanceOf(
                NotFoundError,
            );
            expect(members.addMember).not.toHaveBeenCalled();
        });

        it('adds nobody when someone else used the link first', async () => {
            const { service, members } = setup({ consumed: false });
            await expect(service.accept('secret', 'u2')).rejects.toBeInstanceOf(
                NotFoundError,
            );
            expect(members.addMember).not.toHaveBeenCalled();
        });
    });
});
