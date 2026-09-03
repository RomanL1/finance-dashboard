import { forwardRef, Module } from '@nestjs/common';
import { HouseholdModule } from '../household/household.module.js';
import { AccountController } from './api/account.controller.js';
import { AccountRepository } from './repository/account.repository.js';
import { AccountService } from './service/account.service.js';

@Module({
    imports: [forwardRef(() => HouseholdModule)],
    controllers: [AccountController],
    providers: [AccountService, AccountRepository],
    exports: [AccountService],
})
export class AccountModule {}
