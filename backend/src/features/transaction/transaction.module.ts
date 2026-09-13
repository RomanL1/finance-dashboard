import { Module } from '@nestjs/common';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module.js';
import { HouseholdModule } from '../household/household.module.js';
import { TransactionController } from './api/transaction.controller.js';
import { TransactionRepository } from './repository/transaction.repository.js';
import { TransactionService } from './service/transaction.service.js';

@Module({
    imports: [HouseholdModule, ExchangeRateModule],
    controllers: [TransactionController],
    providers: [TransactionService, TransactionRepository],
})
export class TransactionModule {}
