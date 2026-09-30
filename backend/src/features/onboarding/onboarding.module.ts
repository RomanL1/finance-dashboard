import { Module } from '@nestjs/common';
import { OnboardingController } from './api/onboarding.controller.js';
import { OnboardingRepository } from './repository/onboarding.repository.js';
import { OnboardingService } from './service/onboarding.service.js';

@Module({
    controllers: [OnboardingController],
    providers: [OnboardingService, OnboardingRepository],
})
export class OnboardingModule {}
