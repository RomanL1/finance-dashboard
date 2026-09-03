import { Module } from '@nestjs/common';
import { HouseholdModule } from '../household/household.module.js';
import { OnboardingController } from './api/onboarding.controller.js';
import { OnboardingRepository } from './repository/onboarding.repository.js';
import { OnboardingService } from './service/onboarding.service.js';

@Module({
    imports: [HouseholdModule],
    controllers: [OnboardingController],
    providers: [OnboardingService, OnboardingRepository],
})
export class OnboardingModule {}
