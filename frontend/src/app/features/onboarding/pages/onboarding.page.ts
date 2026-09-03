import {
    ChangeDetectionStrategy,
    Component,
    resource,
    signal,
    viewChild,
    type Signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatStep, MatStepLabel, MatStepper } from '@angular/material/stepper';
import { APP_PATHS } from '../../../config/paths.config';
import { ButtonComponent } from '../../../components/button/button.component';
import { HouseholdFormComponent } from '../dumb_components/household-form/household-form.component';
import { CurrencyFormComponent } from '../dumb_components/currency-form/currency-form.component';
import { CategoryPickerComponent } from '../dumb_components/category-picker/category-picker.component';
import { AccountFormComponent } from '../../account/dumb_components/account-form/account-form.component';
import type { CreateAccountDto } from '../../account/account.types';
import { OnboardingService } from '../services/onboarding.service';
import {
    OnboardingStateService,
    type OnboardingDraft,
} from '../services/onboarding-state.service';
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
        AccountFormComponent,
        ButtonComponent,
        TranslatePipe,
    ],
    template: `
        <main class="mx-auto mt-16 max-w-lg p-4">
            <h1 class="mb-6 text-2xl font-semibold">
                {{ 'onboarding.title' | translate }}
            </h1>
            <mat-stepper linear orientation="vertical">
                <mat-step [completed]="!!draft().name">
                    <ng-template matStepLabel>{{
                        'onboarding.steps.household' | translate
                    }}</ng-template>
                    <app-household-form
                        [initialName]="draft().name ?? ''"
                        [busy]="busy()"
                        [errorMessage]="error()"
                        (submitted)="onHouseholdNameSubmit($event)"
                    />
                </mat-step>

                <mat-step [completed]="!!draft().currency">
                    <ng-template matStepLabel>{{
                        'onboarding.steps.currency' | translate
                    }}</ng-template>
                    <app-currency-form
                        [initialCurrency]="draft().currency ?? null"
                        [busy]="busy()"
                        [errorMessage]="error()"
                        (submitted)="onCurrencySubmit($event)"
                    />
                    <app-button
                        type="button"
                        variant="outlined"
                        class="mt-2 block"
                        (clicked)="goBack()"
                    >
                        {{ 'onboarding.back' | translate }}
                    </app-button>
                </mat-step>

                <mat-step [completed]="!!draft().categories">
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
                    <app-button
                        type="button"
                        variant="outlined"
                        class="mt-2 block"
                        (clicked)="goBack()"
                    >
                        {{ 'onboarding.back' | translate }}
                    </app-button>
                </mat-step>

                <mat-step>
                    <ng-template matStepLabel>{{
                        'onboarding.steps.accounts' | translate
                    }}</ng-template>
                    @if (draft().currency; as currency) {
                        <p>
                            {{ 'onboarding.accounts.description' | translate }}
                        </p>
                        <app-account-form
                            [defaultCurrency]="currency"
                            [busy]="busy()"
                            [errorMessage]="error()"
                            (submitted)="onAccountSubmit($event)"
                        />
                    }
                    <app-button
                        type="button"
                        variant="outlined"
                        class="mt-2 block"
                        (clicked)="goBack()"
                    >
                        {{ 'onboarding.back' | translate }}
                    </app-button>
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
    readonly draft: Signal<OnboardingDraft>;

    readonly defaultCategories = resource({
        loader: () => this.onboardingService.getDefaultCategories(),
    });

    constructor(
        private readonly onboardingService: OnboardingService,
        private readonly onboardingState: OnboardingStateService,
        private readonly router: Router,
        private readonly translate: TranslateService,
    ) {
        this.draft = this.onboardingState.draft;

        /** Resume mid-flow from the cached draft on page reload. */
        const resumeIndex = this.resumeIndexFor(this.draft());
        if (resumeIndex > 0) this.goToStep(resumeIndex);
    }

    private resumeIndexFor(draft: OnboardingDraft): number {
        if (draft.categories) return 3;
        if (draft.currency) return 2;
        if (draft.name) return 1;
        return 0;
    }

    private goToStep(index: number): void {
        /** Deferred: [completed] on the target's preceding steps is signal-driven
         * and may not have flushed to the stepper yet in the same tick (a
         * microtask isn't enough — it can race Angular's own CD scheduling),
         * which makes the linear stepper silently reject the jump. */
        setTimeout(() => {
            const stepper = this.stepper();
            if (stepper) stepper.selectedIndex = index;
        });
    }

    goBack(): void {
        const stepper = this.stepper();
        if (stepper && stepper.selectedIndex > 0) {
            stepper.selectedIndex -= 1;
        }
    }

    onHouseholdNameSubmit(name: string): void {
        this.error.set(null);
        this.onboardingState.setHousehold(name);
        this.goToStep(1);
    }

    async onCurrencySubmit(currency: Currency): Promise<void> {
        const name = this.draft().name;
        if (!name) return;

        this.busy.set(true);
        this.error.set(null);
        try {
            await this.onboardingService.validateHousehold(name, currency);
            this.onboardingState.setCurrency(currency);
            this.goToStep(2);
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
        const categoryNames = this.resolveCategoryNames(selection);

        this.busy.set(true);
        this.error.set(null);
        try {
            await this.onboardingService.validateCategories(categoryNames);
            this.onboardingState.setCategories(selection);
            this.goToStep(3);
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

    async onAccountSubmit(dto: CreateAccountDto): Promise<void> {
        const draft = this.draft();
        if (!draft.name || !draft.currency || !draft.categories) return;

        this.busy.set(true);
        this.error.set(null);
        try {
            await this.onboardingService.validateAccounts([dto]);
            await this.onboardingService.submit({
                name: draft.name,
                currency: draft.currency,
                categoryNames: this.resolveCategoryNames(draft.categories),
                accounts: [dto],
            });
            this.onboardingState.clear();
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

    private resolveCategoryNames(selection: CategorySelection): string[] {
        const defaultNames = selection.translateKeys.map((key) =>
            this.translate.instant('category.default.' + key),
        );
        return [...defaultNames, ...selection.customNames];
    }
}
