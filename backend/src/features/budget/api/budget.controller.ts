import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiConflictResponse,
    ApiCookieAuth,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { type Id } from '../../../shared/kernel/index.js';
import { HouseholdMemberGuard } from '../../household/guard/household-member.guard.js';
import {
    BudgetDto,
    BudgetListQueryDto,
    CopiedBudgetsDto,
    CopyPreviousQueryDto,
    SetBudgetDto,
} from '../model/budget.dto.js';
import { BudgetService } from '../service/budget.service.js';
import {
    toBudgetDto,
    toBudgetsDto,
    toCopiedBudgetsDto,
} from './budget.mapper.js';

@ApiTags('budget')
@ApiCookieAuth()
@ApiParam({ name: 'householdId', description: 'Household id', type: String })
@UseGuards(HouseholdMemberGuard)
@Controller('households/:householdId/budgets')
export class BudgetController {
    constructor(private readonly budgets: BudgetService) {}

    @Get()
    @ApiOkResponse({ type: [BudgetDto] })
    async getBudgets(
        @Param('householdId') householdId: Id,
        @Query() query: BudgetListQueryDto,
    ): Promise<BudgetDto[]> {
        return toBudgetsDto(
            await this.budgets.getByMonth(householdId, query.month),
        );
    }

    @Put(':categoryId/:month')
    @ApiParam({ name: 'categoryId', description: 'Category id', type: String })
    @ApiParam({
        name: 'month',
        description: 'Calendar month as YYYY-MM',
        type: String,
    })
    @ApiOkResponse({ type: BudgetDto })
    async setBudget(
        @Param('householdId') householdId: Id,
        @Param('categoryId') categoryId: Id,
        @Param('month') month: string,
        @Body() dto: SetBudgetDto,
    ): Promise<BudgetDto> {
        return toBudgetDto(
            await this.budgets.set(householdId, {
                categoryId,
                month,
                amount: dto.amount,
            }),
        );
    }

    @Post(':month/copy-previous')
    @ApiParam({
        name: 'month',
        description: 'Calendar month as YYYY-MM',
        type: String,
    })
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        type: CopiedBudgetsDto,
        description:
            'The month now holds copies of the nearest earlier month with limits; empty when there is none',
    })
    @ApiConflictResponse({ description: 'The month already has limits' })
    async copyPreviousBudgets(
        @Param('householdId') householdId: Id,
        @Param('month') month: string,
        @Query() query: CopyPreviousQueryDto,
    ): Promise<CopiedBudgetsDto> {
        return toCopiedBudgetsDto(
            await this.budgets.copyFromPrevious(
                householdId,
                month,
                query.auto ?? false,
            ),
        );
    }

    @Delete(':categoryId/:month')
    @ApiParam({ name: 'categoryId', description: 'Category id', type: String })
    @ApiParam({
        name: 'month',
        description: 'Calendar month as YYYY-MM',
        type: String,
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({
        description: 'Budget removed; the category has no limit for that month',
    })
    async deleteBudget(
        @Param('householdId') householdId: Id,
        @Param('categoryId') categoryId: Id,
        @Param('month') month: string,
    ): Promise<void> {
        await this.budgets.remove(householdId, categoryId, month);
    }
}
