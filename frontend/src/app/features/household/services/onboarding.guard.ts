import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { APP_PATHS } from '../../../config/paths.config';
import { HouseholdService } from './household.service';

/** Redirects to /onboarding until the household exists and onboarding is complete. */
@Injectable({ providedIn: 'root' })
export class OnboardingGuard implements CanActivate {
    constructor(
        private readonly householdService: HouseholdService,
        private readonly router: Router,
    ) {}

    async canActivate(): Promise<boolean | UrlTree> {
        const household = await this.householdService.getHouseholdOrNull();
        return household?.onboardingComplete
            ? true
            : this.router.createUrlTree(['/' + APP_PATHS.ONBOARDING]);
    }
}

/** Redirects away from /onboarding once onboarding is already complete. */
@Injectable({ providedIn: 'root' })
export class OnboardingCompleteGuard implements CanActivate {
    constructor(
        private readonly householdService: HouseholdService,
        private readonly router: Router,
    ) {}

    async canActivate(): Promise<boolean | UrlTree> {
        const household = await this.householdService.getHouseholdOrNull();
        return household?.onboardingComplete
            ? this.router.createUrlTree(['/' + APP_PATHS.HOME])
            : true;
    }
}
