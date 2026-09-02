import { Module } from '@nestjs/common';
import { HouseholdController } from './api/household.controller.js';
import { HouseholdRepository } from './repository/household.repository.js';
import { HouseholdService } from './service/household.service.js';

@Module({
    controllers: [HouseholdController],
    providers: [HouseholdService, HouseholdRepository],
    exports: [HouseholdService],
})
export class HouseholdModule {}
