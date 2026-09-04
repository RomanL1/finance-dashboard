import { Module } from '@nestjs/common';
import { HouseholdModule } from '../household/household.module.js';
import { TransactionController } from './api/transaction.controller.js';
import { TransactionRepository } from './repository/transaction.repository.js';
import { TransactionService } from './service/transaction.service.js';

@Module({
    imports: [HouseholdModule],
    controllers: [TransactionController],
    providers: [TransactionService, TransactionRepository],
})
export class TransactionModule {}
