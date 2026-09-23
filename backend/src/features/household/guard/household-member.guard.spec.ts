import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { describe, expect, it, vi } from 'vitest';
import { makeSession } from '../../../../test/fixtures/auth-session.js';
import { makeHousehold } from '../../../../test/fixtures/household.js';
import { ForbiddenError } from '../../../shared/kernel/index.js';
import type { HouseholdMembership } from '../model/household.js';
import type { HouseholdService } from '../service/household.service.js';
import {
    HouseholdMemberGuard,
    type HouseholdAuthorizedRequest,
} from './household-member.guard.js';

const dummyMembership: HouseholdMembership = {
    role: 'member',
    household: makeHousehold('CHF', 'h1'),
};

function makeGuard(assertMember = vi.fn<HouseholdService['assertMember']>()) {
    const households: Pick<HouseholdService, 'assertMember'> = { assertMember };
    // The fake covers the one method the guard calls.
    return {
        guard: new HouseholdMemberGuard(households as HouseholdService),
        assertMember,
    };
}

function contextWith(request: Partial<HouseholdAuthorizedRequest>) {
    return new ExecutionContextHost([request]);
}

describe('HouseholdMemberGuard', () => {
    it('throws ForbiddenError if householdId param is missing', async () => {
        const { guard, assertMember } = makeGuard();

        await expect(
            guard.canActivate(
                contextWith({ params: {}, session: makeSession('u1') }),
            ),
        ).rejects.toBeInstanceOf(ForbiddenError);
        expect(assertMember).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError if user session is missing', async () => {
        const { guard, assertMember } = makeGuard();

        await expect(
            guard.canActivate(
                contextWith({
                    params: { householdId: 'h1' },
                    session: undefined,
                }),
            ),
        ).rejects.toBeInstanceOf(ForbiddenError);
        expect(assertMember).not.toHaveBeenCalled();
    });

    it('attaches householdMembership to request and returns true on valid membership', async () => {
        const { guard, assertMember } = makeGuard(
            vi
                .fn<HouseholdService['assertMember']>()
                .mockResolvedValue(dummyMembership),
        );
        const request: Partial<HouseholdAuthorizedRequest> = {
            params: { householdId: 'h1' },
            session: makeSession('u1'),
        };

        const result = await guard.canActivate(contextWith(request));
        expect(result).toBe(true);
        expect(assertMember).toHaveBeenCalledWith('h1', 'u1');
        expect(request.householdMembership).toEqual(dummyMembership);
    });

    it('propagates the rejection of a non-member and attaches nothing', async () => {
        const { guard } = makeGuard(
            vi
                .fn<HouseholdService['assertMember']>()
                .mockRejectedValue(new ForbiddenError('not a member')),
        );
        const request: Partial<HouseholdAuthorizedRequest> = {
            params: { householdId: 'h2' },
            session: makeSession('u1'),
        };

        await expect(
            guard.canActivate(contextWith(request)),
        ).rejects.toBeInstanceOf(ForbiddenError);
        expect(request.householdMembership).toBeUndefined();
    });
});
