import {
    ChangeDetectionStrategy,
    Component,
    effect,
    resource,
    signal,
    viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatStep, MatStepLabel, MatStepper } from '@angular/material/stepper';
import { APP_PATHS } from '../../../config/paths.config';
import { HouseholdService } from '../../household/services/household.service';
import { HouseholdFormComponent } from '../dumb_components/household-form/household-form.component';
import { CurrencyFormComponent } from '../dumb_components/currency-form/currency-form.component';
import { CategoryPickerComponent } from '../dumb_components/category-picker/category-picker.component';
import { OnboardingService } from '../services/onboarding.service';
import type { CategorySelection, Currency } from '../onboarding.types';

@Component({
    selector: 'app-onboarding-page',
    imports: [
        MatStepper,
        MatStep,
        MatStepLabel,
        HouseholdFormComponent,
        CurrencyFormComponent,
        CategoryPickerComponent,
        TranslatePipe,
    ],
    template: `
        <main class="mx-auto mt-16 max-w-lg p-4">
            <h1 class="mb-6 text-2xl font-semibold">
                {{ 'onboarding.title' | translate }}
            </h1>
            <mat-stepper linear>
                <mat-step
                    [completed]="!!householdName() || !!household.value()"
                >
                    <ng-template matStepLabel>{{
                        'onboarding.steps.household' | translate
                    }}</ng-template>
                    @if (household.isLoading()) {
                        <p>{{ 'onboarding.household.loading' | translate }}</p>
                    } @else if (!household.value() && !householdName()) {
                        <app-household-form
                            [busy]="busy()"
                            [errorMessage]="error()"
                            (submitted)="onHouseholdNameSubmit($event)"
                        />
                    }
                </mat-step>

                <mat-step [completed]="!!household.value()">
                    <ng-template matStepLabel>{{
                        'onboarding.steps.currency' | translate
                    }}</ng-template>
                    @if (!household.value()) {
                        <app-currency-form
                            [busy]="busy()"
                            [errorMessage]="error()"
                            (submitted)="onCurrencySubmit($event)"
                        />
                    }
                </mat-step>

                <mat-step>
                    <ng-template matStepLabel>{{
                        'onboarding.steps.categories' | translate
                    }}</ng-template>
                    @if (defaultCategories.isLoading()) {
                        <p>
                            {{ 'onboarding.categories.loading' | translate }}
                        </p>
                    } @else if (defaultCategories.value(); as categories) {
                        <app-category-picker
                            [categories]="categories"
                            [busy]="busy()"
                            [errorMessage]="error()"
                            (submitted)="onCategoriesSubmit($event)"
                        />
                    }
                </mat-step>
            </mat-stepper>
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {
    private readonly stepper = viewChild(MatStepper);

    readonly busy = signal(false);
    readonly error = signal<string | null>(null);
    readonly householdName = signal<string | null>(null);

    readonly household = resource({
        loader: () => this.householdService.getHouseholdOrNull(),
    });

    readonly defaultCategories = resource({
        params: () => this.household.value()?.id,
        loader: ({ params }) =>
            this.onboardingService.getDefaultCategories(params),
    });

    constructor(
        private readonly householdService: HouseholdService,
        private readonly onboardingService: OnboardingService,
        private readonly router: Router,
        private readonly translate: TranslateService,
    ) {
        effect(() => {
            const stepper = this.stepper();
            if (!stepper) return;

            if (this.household.value() && stepper.selectedIndex < 2) {
                stepper.selectedIndex = 2;
            } else if (this.householdName() && stepper.selectedIndex === 0) {
                stepper.selectedIndex = 1;
            }
        });
    }

    onHouseholdNameSubmit(name: string): void {
        this.error.set(null);
        this.householdName.set(name);
    }

    async onCurrencySubmit(currency: Currency): Promise<void> {
        const name = this.householdName();
        if (!name) return;

        this.busy.set(true);
        this.error.set(null);
        try {
            await this.onboardingService.createHousehold(name, currency);
            await this.household.reload();
        } catch (e) {
            this.error.set(
                e instanceof Error
                    ? e.message
                    : this.translate.instant('onboarding.failed'),
            );
        } finally {
            this.busy.set(false);
        }
    }

    async onCategoriesSubmit(selection: CategorySelection): Promise<void> {
        const householdId = this.household.value()?.id;
        if (!householdId) return;

        this.busy.set(true);
        this.error.set(null);
        try {
            for (const key of selection.translateKeys) {
                const name = this.translate.instant('category.default.' + key);
                await this.onboardingService.createCategory(householdId, name);
            }
            for (const name of selection.customNames) {
                await this.onboardingService.createCategory(householdId, name);
            }
            await this.onboardingService.completeOnboarding(householdId);
            await this.router.navigate(['/' + APP_PATHS.HOME]);
        } catch (e) {
            this.error.set(
                e instanceof Error
                    ? e.message
                    : this.translate.instant('onboarding.failed'),
            );
        } finally {
            this.busy.set(false);
        }
    }
}
