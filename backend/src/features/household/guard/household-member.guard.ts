import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../shared/infra/auth/session.decorator.js';
import { ForbiddenError, type Id } from '../../../shared/kernel/index.js';
import type { HouseholdMembership } from '../model/household.js';
import { HouseholdService } from '../service/household.service.js';

export type HouseholdAuthorizedRequest = AuthenticatedRequest & {
    householdMembership?: HouseholdMembership;
};

@Injectable()
export class HouseholdMemberGuard implements CanActivate {
    constructor(private readonly households: HouseholdService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<HouseholdAuthorizedRequest>();
        const householdId = request.params?.householdId as Id | undefined;
        const userId = request.session?.user?.id as Id | undefined;

        if (!householdId || !userId) {
            throw new ForbiddenError('Household authorization required');
        }

        request.householdMembership = await this.households.assertMember(
            householdId,
            userId,
        );
        return true;
    }
}
