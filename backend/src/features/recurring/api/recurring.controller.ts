import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Patch,
    UseGuards,
} from '@nestjs/common';
import {
    ApiCookieAuth,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import type { Id } from '../../../shared/kernel/index.js';
import { HouseholdMemberGuard } from '../../household/guard/household-member.guard.js';
import {
    RecurringTransactionDto,
    SaveRecurringTransactionDto,
} from '../model/recurring.dto.js';
import type { RecurringTransactionInput } from '../model/recurring.js';
import { RecurringService } from '../service/recurring.service.js';
import { toRecurringTransactionDto } from './recurring.mapper.js';

@ApiTags('recurring-transaction')
@ApiCookieAuth()
@ApiParam({ name: 'householdId', description: 'Household id', type: String })
@UseGuards(HouseholdMemberGuard)
@Controller('households/:householdId/recurring-transactions')
export class RecurringController {
    constructor(private readonly recurring: RecurringService) {}

    @Get()
    @ApiOkResponse({ type: [RecurringTransactionDto] })
    async getRecurringTransactions(
        @Param('householdId') householdId: Id,
    ): Promise<RecurringTransactionDto[]> {
        return (await this.recurring.getAll(householdId)).map(
            toRecurringTransactionDto,
        );
    }

    @Post()
    @ApiOkResponse({ type: RecurringTransactionDto })
    async createRecurringTransaction(
        @Param('householdId') householdId: Id,
        @Body() dto: SaveRecurringTransactionDto,
    ): Promise<RecurringTransactionDto> {
        return toRecurringTransactionDto(
            await this.recurring.create(householdId, toInput(dto)),
        );
    }

    @Patch(':recurringTransactionId')
    @ApiParam({
        name: 'recurringTransactionId',
        description: 'Recurring transaction id',
        type: String,
    })
    @ApiOkResponse({ type: RecurringTransactionDto })
    async updateRecurringTransaction(
        @Param('householdId') householdId: Id,
        @Param('recurringTransactionId') id: Id,
        @Body() dto: SaveRecurringTransactionDto,
    ): Promise<RecurringTransactionDto> {
        return toRecurringTransactionDto(
            await this.recurring.update(householdId, id, toInput(dto)),
        );
    }

    @Post(':recurringTransactionId/pause')
    @HttpCode(HttpStatus.OK)
    @ApiParam({
        name: 'recurringTransactionId',
        description: 'Recurring transaction id',
        type: String,
    })
    @ApiOkResponse({ type: RecurringTransactionDto })
    async pauseRecurringTransaction(
        @Param('householdId') householdId: Id,
        @Param('recurringTransactionId') id: Id,
    ): Promise<RecurringTransactionDto> {
        return toRecurringTransactionDto(
            await this.recurring.pause(householdId, id),
        );
    }

    @Post(':recurringTransactionId/resume')
    @HttpCode(HttpStatus.OK)
    @ApiParam({
        name: 'recurringTransactionId',
        description: 'Recurring transaction id',
        type: String,
    })
    @ApiOkResponse({ type: RecurringTransactionDto })
    async resumeRecurringTransaction(
        @Param('householdId') householdId: Id,
        @Param('recurringTransactionId') id: Id,
    ): Promise<RecurringTransactionDto> {
        return toRecurringTransactionDto(
            await this.recurring.resume(householdId, id),
        );
    }

    @Delete(':recurringTransactionId')
    @ApiParam({
        name: 'recurringTransactionId',
        description: 'Recurring transaction id',
        type: String,
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({
        description: 'Deleted; transactions it created stay',
    })
    async deleteRecurringTransaction(
        @Param('householdId') householdId: Id,
        @Param('recurringTransactionId') id: Id,
    ): Promise<void> {
        await this.recurring.delete(householdId, id);
    }
}

function toInput(dto: SaveRecurringTransactionDto): RecurringTransactionInput {
    return {
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        type: dto.type,
        amount: dto.amount,
        title: dto.title,
        description: dto.description,
        interval: dto.interval,
        weekday: dto.weekday,
        dayOfMonth: dto.dayOfMonth,
        startDate: dto.startDate,
        varyingAmount: dto.varyingAmount,
        weekendShift: dto.weekendShift,
    };
}
