import { Module } from '@nestjs/common';
import { HouseholdModule } from '../household/household.module.js';
import { TransferController } from './api/transfer.controller.js';
import { TransferRepository } from './repository/transfer.repository.js';
import { TransferService } from './service/transfer.service.js';

@Module({
    imports: [HouseholdModule],
    controllers: [TransferController],
    providers: [TransferService, TransferRepository],
})
export class TransferModule {}
