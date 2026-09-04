import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
    ApiCookieAuth,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { TransactionService } from '../service/transaction.service.js';
import {
    CreateTransactionDto,
    TransactionDto,
} from '../model/transaction.dto.js';
import { toTransactionDto, toTransactionsDto } from './transaction.mapper.js';
import { type Id } from '../../../shared/kernel/index.js';
import { HouseholdMemberGuard } from '../../household/guard/household-member.guard.js';

@ApiTags('transaction')
@ApiCookieAuth()
@ApiParam({ name: 'householdId', description: 'Household id', type: String })
@UseGuards(HouseholdMemberGuard)
@Controller('households/:householdId/transactions')
export class TransactionController {
    constructor(private readonly transactions: TransactionService) {}

    @Get()
    @ApiOkResponse({ type: [TransactionDto] })
    async getTransactions(
        @Param('householdId') householdId: Id,
    ): Promise<TransactionDto[]> {
        return toTransactionsDto(await this.transactions.getAll(householdId));
    }

    @Post()
    @ApiOkResponse({ type: TransactionDto })
    async createTransaction(
        @Param('householdId') householdId: Id,
        @Body() dto: CreateTransactionDto,
    ): Promise<TransactionDto> {
        return toTransactionDto(
            await this.transactions.create(householdId, {
                accountId: dto.accountId,
                categoryId: dto.categoryId,
                type: dto.type,
                amount: dto.amount,
                title: dto.title,
                description: dto.description,
                date: new Date(dto.date),
            }),
        );
    }
}
