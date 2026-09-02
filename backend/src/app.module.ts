import { Module } from '@nestjs/common';
import { HouseholdModule } from './features/household/household.module.js';
import { AuthModule } from './shared/infra/auth/auth.module.js';
import { DbModule } from './shared/infra/db/db.module.js';

@Module({
    imports: [DbModule, AuthModule, HouseholdModule],
})
export class AppModule {}
