import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError } from '../../../shared/kernel/index.js';
import type { HouseholdMembership } from '../model/household.js';
import type { HouseholdService } from '../service/household.service.js';
import {
    HouseholdMemberGuard,
    type HouseholdAuthorizedRequest,
} from './household-member.guard.js';

const dummyMembership: HouseholdMembership = {
    role: 'member',
    household: {
        id: 'h1',
        name: 'Home',
        currency: 'CHF',
        onboardingComplete: false,
        createdAt: new Date('2026-01-01'),
    },
};

function createMockContext(
    request: Partial<HouseholdAuthorizedRequest>,
): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => request,
        }),
    } as unknown as ExecutionContext;
}

describe('HouseholdMemberGuard', () => {
    it('throws ForbiddenError if householdId param is missing', async () => {
        const householdService = {
            assertMember: vi.fn(),
        } as unknown as HouseholdService;
        const guard = new HouseholdMemberGuard(householdService);
        const context = createMockContext({
            params: {},
            session: {
                user: { id: 'u1' },
            } as unknown as HouseholdAuthorizedRequest['session'],
        });

        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
            ForbiddenError,
        );
        expect(householdService.assertMember).not.toHaveBeenCalled();
    });

    it('throws ForbiddenError if user session is missing', async () => {
        const householdService = {
            assertMember: vi.fn(),
        } as unknown as HouseholdService;
        const guard = new HouseholdMemberGuard(householdService);
        const context = createMockContext({
            params: { householdId: 'h1' },
            session: undefined,
        });

        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
            ForbiddenError,
        );
        expect(householdService.assertMember).not.toHaveBeenCalled();
    });

    it('attaches householdMembership to request and returns true on valid membership', async () => {
        const householdService = {
            assertMember: vi.fn().mockResolvedValue(dummyMembership),
        } as unknown as HouseholdService;
        const guard = new HouseholdMemberGuard(householdService);
        const request: Partial<HouseholdAuthorizedRequest> = {
            params: { householdId: 'h1' },
            session: {
                user: { id: 'u1' },
            } as unknown as HouseholdAuthorizedRequest['session'],
        };
        const context = createMockContext(request);

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
        expect(householdService.assertMember).toHaveBeenCalledWith('h1', 'u1');
        expect(request.householdMembership).toEqual(dummyMembership);
    });
});
