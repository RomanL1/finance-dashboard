import { Module } from '@nestjs/common';
import { HouseholdModule } from '../household/household.module.js';
import { FrankfurterClient } from './client/frankfurter.client.js';
import { ExchangeRateRepository } from './repository/exchange-rate.repository.js';
import { ExchangeRateService } from './service/exchange-rate.service.js';

@Module({
    imports: [HouseholdModule],
    providers: [ExchangeRateService, ExchangeRateRepository, FrankfurterClient],
    exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
