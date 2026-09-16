import { BudgetDto } from '../model/budget.dto.js';
import type { Budget } from '../model/budget.js';

export function toBudgetDto({
    id,
    categoryId,
    month,
    amount,
}: Budget): BudgetDto {
    const dto = new BudgetDto();
    dto.id = id;
    dto.categoryId = categoryId;
    dto.month = month;
    dto.amount = amount;
    return dto;
}

export function toBudgetsDto(budgets: Budget[]): BudgetDto[] {
    return budgets.map(toBudgetDto);
}
