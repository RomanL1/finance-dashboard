import { ChangeDetectionStrategy, Component, resource } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS } from '../../../config/paths.config';
import { ButtonComponent } from '../../../components/button/button.component';
import { HouseholdCardComponent } from '../dumb_components/household-card/household-card.component';
import { HouseholdService } from '../services/household.service';
import { AccountListComponent } from '../../account/dumb_components/account-list/account-list.component';
import { AccountService } from '../../account/services/account.service';

@Component({
    selector: 'app-home-page',
    imports: [
        ButtonComponent,
        HouseholdCardComponent,
        AccountListComponent,
        TranslatePipe,
    ],
    template: `
        <main class="mx-auto mt-16 max-w-lg p-4">
            <header class="mb-6 flex items-center justify-between">
                <h1 class="text-2xl font-semibold">
                    {{
                        'home.greeting' | translate: { name: auth.user()?.name }
                    }}
                </h1>
                <app-button
                    type="button"
                    variant="outlined"
                    (clicked)="signOut()"
                >
                    {{ 'home.signOut' | translate }}
                </app-button>
            </header>
            @if (household.isLoading()) {
                <p>{{ 'home.loadingHousehold' | translate }}</p>
            } @else if (household.error()) {
                <p role="alert" class="text-red-700">
                    {{ 'home.noHouseholdFound' | translate }}
                </p>
            } @else if (household.value(); as h) {
                <app-household-card [household]="h" />
                @if (accounts.value(); as accts) {
                    <app-account-list [accounts]="accts" class="mt-6 block" />
                }
            }
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
    readonly household = resource({
        loader: () => this.householdService.getHousehold(),
    });

    readonly accounts = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) => this.accountService.list(params),
    });

    constructor(
        protected readonly auth: AuthService,
        private readonly householdService: HouseholdService,
        private readonly accountService: AccountService,
        private readonly router: Router,
    ) {}

    async signOut(): Promise<void> {
        await this.auth.signOut();
        await this.router.navigate(['/' + APP_PATHS.LOGIN]);
    }
}
