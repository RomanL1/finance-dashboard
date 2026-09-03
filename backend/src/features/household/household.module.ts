import { forwardRef, Module } from '@nestjs/common';
import { CategoryModule } from '../category/category.module.js';
import { HouseholdController } from './api/household.controller.js';
import { HouseholdMemberGuard } from './guard/household-member.guard.js';
import { HouseholdRepository } from './repository/household.repository.js';
import { HouseholdService } from './service/household.service.js';

@Module({
    imports: [forwardRef(() => CategoryModule)],
    controllers: [HouseholdController],
    providers: [HouseholdService, HouseholdRepository, HouseholdMemberGuard],
    exports: [HouseholdService, HouseholdMemberGuard],
})
export class HouseholdModule {}
