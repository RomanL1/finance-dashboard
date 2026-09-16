import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Put,
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
import { type Id } from '../../../shared/kernel/index.js';
import { HouseholdMemberGuard } from '../../household/guard/household-member.guard.js';
import {
    BudgetDto,
    BudgetListQueryDto,
    SetBudgetDto,
} from '../model/budget.dto.js';
import { BudgetService } from '../service/budget.service.js';
import { toBudgetDto, toBudgetsDto } from './budget.mapper.js';

/** A limit is addressed by (category, month); there is at most one per pair, so PUT creates or replaces it. */
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
