import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
    ApiCookieAuth,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { type Id } from '../../../shared/kernel/index.js';
import { HouseholdMemberGuard } from '../../household/guard/household-member.guard.js';
import { HouseholdBalanceDto } from '../model/account.dto.js';
import { AccountService } from '../service/account.service.js';
import { toHouseholdBalanceDto } from './account.mapper.js';

/** Lives in the account feature: the balance is derived from accounts, the route just hangs off the household. */
@ApiTags('household')
@ApiCookieAuth()
@ApiParam({ name: 'householdId', description: 'Household id', type: String })
@UseGuards(HouseholdMemberGuard)
@Controller('households/:householdId')
export class HouseholdBalanceController {
    constructor(private readonly accounts: AccountService) {}

    /** Sum of the active account balances at today's rate. 503 when a needed rate was never mirrored. */
    @Get('balance')
    @ApiOkResponse({ type: HouseholdBalanceDto })
    async getBalance(
        @Param('householdId') householdId: Id,
    ): Promise<HouseholdBalanceDto> {
        return toHouseholdBalanceDto(
            await this.accounts.getHouseholdBalance(householdId),
        );
    }
}
