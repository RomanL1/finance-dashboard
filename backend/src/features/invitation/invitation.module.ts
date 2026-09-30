import { Module } from '@nestjs/common';
import { HouseholdModule } from '../household/household.module.js';
import {
    HouseholdInvitationController,
    InvitationController,
} from './api/invitation.controller.js';
import { InvitationRepository } from './repository/invitation.repository.js';
import { InvitationService } from './service/invitation.service.js';

@Module({
    imports: [HouseholdModule],
    controllers: [HouseholdInvitationController, InvitationController],
    providers: [InvitationService, InvitationRepository],
})
export class InvitationModule {}
