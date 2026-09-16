import { Module } from '@nestjs/common';
import { CategoryModule } from '../category/category.module.js';
import { HouseholdModule } from '../household/household.module.js';
import { BudgetController } from './api/budget.controller.js';
import { BudgetRepository } from './repository/budget.repository.js';
import { BudgetService } from './service/budget.service.js';

@Module({
    imports: [HouseholdModule, CategoryModule],
    controllers: [BudgetController],
    providers: [BudgetService, BudgetRepository],
})
export class BudgetModule {}
