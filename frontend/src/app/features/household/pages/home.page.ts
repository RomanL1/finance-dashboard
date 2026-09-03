import { ChangeDetectionStrategy, Component, resource } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { APP_PATHS } from '../../../config/paths.config';
import { ButtonComponent } from '../../../components/button/button.component';
import { HouseholdCardComponent } from '../dumb_components/household-card/household-card.component';
import { HouseholdService } from '../services/household.service';

@Component({
    selector: 'app-home-page',
    imports: [ButtonComponent, HouseholdCardComponent],
    template: `
        <main class="mx-auto mt-16 max-w-lg p-4">
            <header class="mb-6 flex items-center justify-between">
                <h1 class="text-2xl font-semibold">
                    Hallo {{ auth.user()?.name }}
                </h1>
                <app-button
                    type="button"
                    variant="outlined"
                    (clicked)="signOut()"
                >
                    Abmelden
                </app-button>
            </header>
            @if (household.isLoading()) {
                <p>Lade Haushalt…</p>
            } @else if (household.error()) {
                <p role="alert" class="text-red-700">Kein Haushalt gefunden.</p>
            } @else if (household.value(); as h) {
                <app-household-card [household]="h" />
            }
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
    readonly household = resource({
        loader: () => this.householdService.getHousehold(),
    });

    constructor(
        protected readonly auth: AuthService,
        private readonly householdService: HouseholdService,
        private readonly router: Router,
    ) {}

    async signOut(): Promise<void> {
        await this.auth.signOut();
        await this.router.navigate(['/' + APP_PATHS.LOGIN]);
    }
}
