import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../../../components/button/button.component';
import {
    CURRENCIES,
    type Currency,
} from '../../../../core/constants/currencies';
import type { CreateAccountDto } from '../../account.types';

function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

@Component({
    selector: 'app-account-form',
    imports: [
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatError,
        MatSelect,
        MatOption,
        ButtonComponent,
        TranslatePipe,
    ],
    template: `
        <form
            [formGroup]="form"
            (ngSubmit)="submit()"
            class="flex flex-col gap-4"
        >
            <mat-form-field class="flex flex-col gap-1">
                <mat-label>{{
                    'account.form.descriptionLabel' | translate
                }}</mat-label>
                <input
                    matInput
                    formControlName="description"
                    autocomplete="off"
                />
                @if (form.controls.description.hasError('required')) {
                    <mat-error>{{
                        'account.form.descriptionRequired' | translate
                    }}</mat-error>
                }
            </mat-form-field>

            <mat-form-field class="flex flex-col gap-1">
                <mat-label>{{
                    'account.form.currencyLabel' | translate
                }}</mat-label>
                <mat-select formControlName="currency">
                    @for (currency of currencies; track currency) {
                        <mat-option [value]="currency">{{
                            currency
                        }}</mat-option>
                    }
                </mat-select>
            </mat-form-field>

            <mat-form-field class="flex flex-col gap-1">
                <mat-label>{{
                    'account.form.initialValueLabel' | translate
                }}</mat-label>
                <input
                    matInput
                    type="number"
                    step="0.01"
                    formControlName="initialValue"
                />
                @if (form.controls.initialValue.hasError('required')) {
                    <mat-error>{{
                        'account.form.initialValueRequired' | translate
                    }}</mat-error>
                }
            </mat-form-field>

            <mat-form-field class="flex flex-col gap-1">
                <mat-label>{{
                    'account.form.startDateLabel' | translate
                }}</mat-label>
                <input matInput type="date" formControlName="startDate" />
                @if (form.controls.startDate.hasError('required')) {
                    <mat-error>{{
                        'account.form.startDateRequired' | translate
                    }}</mat-error>
                }
            </mat-form-field>

            @if (errorMessage()) {
                <p role="alert" class="text-red-700">{{ errorMessage() }}</p>
            }

            <app-button
                type="submit"
                variant="filled"
                [disabled]="form.invalid || busy()"
            >
                {{ 'account.form.submit' | translate }}
            </app-button>
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFormComponent {
    readonly busy = input<boolean>(false);
    readonly errorMessage = input<string | null>(null);
    readonly submitted = output<CreateAccountDto>();

    readonly currencies = CURRENCIES;

    readonly form = new FormGroup({
        description: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        currency: new FormControl<Currency>('CHF', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        initialValue: new FormControl<number | null>(null, {
            validators: [Validators.required],
        }),
        startDate: new FormControl(todayIsoDate(), {
            nonNullable: true,
            validators: [Validators.required],
        }),
    });

    submit(): void {
        if (this.form.invalid || this.busy()) return;
        const value = this.form.getRawValue();
        this.submitted.emit({
            description: value.description.trim(),
            currency: value.currency,
            initialValue: Math.round((value.initialValue ?? 0) * 100),
            startDate: value.startDate,
        });
    }
}
