import { Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate,
    Router,
    UrlTree,
} from '@angular/router';
import { AuthService } from './auth.service';
import { APP_PATHS, INVITE_PARAM } from '../../config/paths.config';

/** Keeps signed-in users off the login, sign-up and password pages. One who came from an invitation link goes back to it. */
@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
    constructor(
        private readonly auth: AuthService,
        private readonly router: Router,
    ) {}

    async canActivate(
        route: ActivatedRouteSnapshot,
    ): Promise<boolean | UrlTree> {
        if (!this.auth.ready()) {
            await this.auth.refresh();
        }
        if (!this.auth.isAuthenticated()) return true;
        const invite = route.queryParamMap.get(INVITE_PARAM);
        return this.router.createUrlTree(
            invite ? ['/' + APP_PATHS.INVITE, invite] : ['/' + APP_PATHS.HOME],
        );
    }
}
