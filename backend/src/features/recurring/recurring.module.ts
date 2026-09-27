import { Module } from '@nestjs/common';
import { HouseholdModule } from '../household/household.module.js';
import { RecurringController } from './api/recurring.controller.js';
import { RecurringRepository } from './repository/recurring.repository.js';
import { RecurringScheduler } from './service/recurring.scheduler.js';
import { RecurringService } from './service/recurring.service.js';

@Module({
    imports: [HouseholdModule],
    controllers: [RecurringController],
    providers: [RecurringService, RecurringRepository, RecurringScheduler],
})
export class RecurringModule {}
