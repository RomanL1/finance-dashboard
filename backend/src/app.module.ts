import { Module } from '@nestjs/common';
import { HouseholdModule } from './features/household/household.module.js';
import { AuthModule } from './shared/infra/auth/index.js';
import { AppConfigModule } from './shared/infra/config/app-config.module.js';
import { DbModule } from './shared/infra/db/db.module.js';
import { HealthModule } from './shared/infra/health/health.module.js';
import { CategoryModule } from './features/category/category.module.js';
import { AccountModule } from './features/account/account.module.js';
import { OnboardingModule } from './features/onboarding/onboarding.module.js';
import { TransactionModule } from './features/transaction/transaction.module.js';
import { BudgetModule } from './features/budget/budget.module.js';

@Module({
    imports: [
        DbModule,
        AuthModule,
        HealthModule,
        AppConfigModule,
        HouseholdModule,
        CategoryModule,
        AccountModule,
        OnboardingModule,
        TransactionModule,
        BudgetModule,
    ],
})
export class AppModule {}
