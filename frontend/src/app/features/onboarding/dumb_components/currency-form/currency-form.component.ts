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
import { MatOption } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../../../components/button/button.component';
import { CURRENCIES, type Currency } from '../../onboarding.types';

@Component({
    selector: 'app-currency-form',
    imports: [
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
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
                    'onboarding.currency.label' | translate
                }}</mat-label>
                <mat-select formControlName="currency">
                    @for (currency of currencies; track currency) {
                        <mat-option [value]="currency">{{
                            currency
                        }}</mat-option>
                    }
                </mat-select>
                @if (form.controls.currency.hasError('required')) {
                    <mat-error>{{
                        'onboarding.currency.required' | translate
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
                {{ 'onboarding.currency.next' | translate }}
            </app-button>
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencyFormComponent {
    readonly busy = input<boolean>(false);
    readonly errorMessage = input<string | null>(null);
    readonly submitted = output<Currency>();

    readonly currencies = CURRENCIES;

    readonly form = new FormGroup({
        currency: new FormControl<Currency>('CHF', {
            nonNullable: true,
            validators: [Validators.required],
        }),
    });

    submit(): void {
        if (this.form.invalid || this.busy()) return;
        this.submitted.emit(this.form.getRawValue().currency);
    }
}
