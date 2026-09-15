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
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiCookieAuth,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { TransactionService } from '../service/transaction.service.js';
import {
    CategoryStatsDto,
    CreateTransactionDto,
    CurrencyStatsDto,
    StatsQueryDto,
    TransactionDto,
    TransactionListQueryDto,
    TransactionPageDto,
} from '../model/transaction.dto.js';
import {
    toTransactionDto,
    toTransactionPageDto,
} from './transaction.mapper.js';
import { type Id } from '../../../shared/kernel/index.js';
import {
    UNCATEGORIZED,
    type CreateTransactionInput,
    type TransactionFilter,
} from '../model/transaction.js';
import { HouseholdMemberGuard } from '../../household/guard/household-member.guard.js';

@ApiTags('transaction')
@ApiCookieAuth()
@ApiParam({ name: 'householdId', description: 'Household id', type: String })
@UseGuards(HouseholdMemberGuard)
@Controller('households/:householdId/transactions')
export class TransactionController {
    constructor(private readonly transactions: TransactionService) {}

    @Get()
    @ApiOkResponse({ type: TransactionPageDto })
    async getTransactions(
        @Param('householdId') householdId: Id,
        @Query() query: TransactionListQueryDto,
    ): Promise<TransactionPageDto> {
        return toTransactionPageDto(
            await this.transactions.getPage(
                householdId,
                toFilter(query),
                query.page ?? 1,
                query.pageSize,
            ),
        );
    }

    /** Declared before the `:transactionId` routes so `stats` is never read as an id. */
    @Get('stats')
    @ApiOkResponse({ type: CurrencyStatsDto })
    async getStats(
        @Param('householdId') householdId: Id,
        @Query() query: StatsQueryDto,
    ): Promise<CurrencyStatsDto> {
        return this.transactions.getStats(householdId, {
            from: new Date(query.from),
            to: new Date(query.to),
        });
    }

    @Get('stats/categories')
    @ApiOkResponse({ type: CategoryStatsDto })
    async getCategoryStats(
        @Param('householdId') householdId: Id,
        @Query() query: StatsQueryDto,
    ): Promise<CategoryStatsDto> {
        return this.transactions.getCategoryStats(householdId, {
            from: new Date(query.from),
            to: new Date(query.to),
        });
    }

    @Post()
    @ApiOkResponse({ type: TransactionDto })
    async createTransaction(
        @Param('householdId') householdId: Id,
        @Body() dto: CreateTransactionDto,
    ): Promise<TransactionDto> {
        return toTransactionDto(
            await this.transactions.create(householdId, toInput(dto)),
        );
    }

    @Patch(':transactionId')
    @ApiParam({
        name: 'transactionId',
        description: 'Transaction id',
        type: String,
    })
    @ApiOkResponse({ type: TransactionDto })
    async updateTransaction(
        @Param('householdId') householdId: Id,
        @Param('transactionId') transactionId: Id,
        @Body() dto: CreateTransactionDto,
    ): Promise<TransactionDto> {
        return toTransactionDto(
            await this.transactions.update(
                householdId,
                transactionId,
                toInput(dto),
            ),
        );
    }

    @Delete(':transactionId')
    @ApiParam({
        name: 'transactionId',
        description: 'Transaction id',
        type: String,
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Transaction successfully deleted' })
    async deleteTransaction(
        @Param('householdId') householdId: Id,
        @Param('transactionId') transactionId: Id,
    ): Promise<void> {
        await this.transactions.delete(householdId, transactionId);
    }
}

function toFilter(query: TransactionListQueryDto): TransactionFilter {
    return {
        accountId: query.accountId,
        categoryId:
            query.categoryId === UNCATEGORIZED ? null : query.categoryId,
    };
}

function toInput(dto: CreateTransactionDto): CreateTransactionInput {
    return {
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        type: dto.type,
        amount: dto.amount,
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
    };
}
