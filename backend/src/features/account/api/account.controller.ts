import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiCookieAuth,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { AccountService } from '../service/account.service.js';
import {
    AccountDto,
    CreateAccountDto,
    UpdateAccountDto,
} from '../model/account.dto.js';
import { toAccountDto, toAccountsDto } from './account.mapper.js';
import { type Id } from '../../../shared/kernel/index.js';
import { HouseholdMemberGuard } from '../../household/guard/household-member.guard.js';

@ApiTags('account')
@ApiCookieAuth()
@ApiParam({ name: 'householdId', description: 'Household id', type: String })
@UseGuards(HouseholdMemberGuard)
@Controller('households/:householdId/accounts')
export class AccountController {
    constructor(private readonly accounts: AccountService) {}

    @Get()
    @ApiOkResponse({ type: [AccountDto] })
    async getAccounts(
        @Param('householdId') householdId: Id,
    ): Promise<AccountDto[]> {
        return toAccountsDto(await this.accounts.getAll(householdId));
    }

    @Post()
    @ApiOkResponse({ type: AccountDto })
    async createAccount(
        @Param('householdId') householdId: Id,
        @Body() dto: CreateAccountDto,
    ): Promise<AccountDto> {
        return toAccountDto(
            await this.accounts.create(householdId, {
                description: dto.description,
                currency: dto.currency,
                initialValue: dto.initialValue,
                startDate: new Date(dto.startDate),
            }),
        );
    }

    @Patch(':accountId')
    @ApiParam({ name: 'accountId', description: 'Account id', type: String })
    @ApiOkResponse({ type: AccountDto })
    async updateAccount(
        @Param('householdId') householdId: Id,
        @Param('accountId') accountId: Id,
        @Body() dto: UpdateAccountDto,
    ): Promise<AccountDto> {
        return toAccountDto(
            await this.accounts.update(householdId, accountId, {
                description: dto.description,
                currency: dto.currency,
                startDate: new Date(dto.startDate),
                archivedAt: dto.archivedAt ? new Date(dto.archivedAt) : null,
            }),
        );
    }

    /** Also deletes the account's transactions. */
    @Delete(':accountId')
    @ApiParam({ name: 'accountId', description: 'Account id', type: String })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse()
    async deleteAccount(
        @Param('householdId') householdId: Id,
        @Param('accountId') accountId: Id,
    ): Promise<void> {
        await this.accounts.delete(householdId, accountId);
    }
}
