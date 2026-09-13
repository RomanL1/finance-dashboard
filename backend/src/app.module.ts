import { Module } from '@nestjs/common';
import { HouseholdModule } from './features/household/household.module.js';
import { AuthModule } from './shared/infra/auth/index.js';
import { DbModule } from './shared/infra/db/db.module.js';
import { HealthModule } from './shared/infra/health/health.module.js';
import { CategoryModule } from './features/category/category.module.js';
import { AccountModule } from './features/account/account.module.js';
import { OnboardingModule } from './features/onboarding/onboarding.module.js';
import { TransactionModule } from './features/transaction/transaction.module.js';
import { ExchangeRateModule } from './features/exchange-rate/exchange-rate.module.js';

@Module({
    imports: [
        DbModule,
        AuthModule,
        HealthModule,
        HouseholdModule,
        CategoryModule,
        AccountModule,
        OnboardingModule,
        TransactionModule,
        ExchangeRateModule,
    ],
})
export class AppModule {}
