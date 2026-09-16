import { forwardRef, Module } from '@nestjs/common';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module.js';
import { HouseholdModule } from '../household/household.module.js';
import { AccountController } from './api/account.controller.js';
import { HouseholdBalanceController } from './api/household-balance.controller.js';
import { AccountRepository } from './repository/account.repository.js';
import { AccountService } from './service/account.service.js';

@Module({
    imports: [forwardRef(() => HouseholdModule), ExchangeRateModule],
    controllers: [AccountController, HouseholdBalanceController],
    providers: [AccountService, AccountRepository],
    exports: [AccountService],
})
export class AccountModule {}
