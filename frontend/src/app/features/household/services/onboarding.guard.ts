import { Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate,
    Router,
    UrlTree,
} from '@angular/router';
import { APP_PATHS, NEW_HOUSEHOLD_PARAM } from '../../../config/paths.config';
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

/** Redirects away from /onboarding once the user has a household, unless they ask for another one (`?new=1`). */
@Injectable({ providedIn: 'root' })
export class OnboardingCompleteGuard implements CanActivate {
    constructor(
        private readonly householdService: HouseholdService,
        private readonly router: Router,
    ) {}

    async canActivate(
        route: ActivatedRouteSnapshot,
    ): Promise<boolean | UrlTree> {
        if (route.queryParamMap.has(NEW_HOUSEHOLD_PARAM)) return true;
        const household = await this.householdService.getHouseholdOrNull();
        return household?.onboardingComplete
            ? this.router.createUrlTree(['/' + APP_PATHS.HOME])
            : true;
    }
}
