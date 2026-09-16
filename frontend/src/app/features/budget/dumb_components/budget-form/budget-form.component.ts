import {
    ChangeDetectionStrategy,
    Component,
    effect,
    input,
    output,
} from '@angular/core';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import {
    MatError,
    MatFormField,
    MatLabel,
    MatSuffix,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

/** Amount field for one limit. Major units in the field, minor units out. 0 is a valid limit. */
@Component({
    selector: 'app-budget-form',
    imports: [
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatError,
        MatSuffix,
        TranslatePipe,
    ],
    template: `
        <form
            [id]="formId()"
            [formGroup]="form"
            (ngSubmit)="submit()"
            class="flex flex-col gap-4"
        >
            <mat-form-field>
                <mat-label>{{
                    'budget.form.amountLabel' | translate
                }}</mat-label>
                <input
                    matInput
                    type="number"
                    inputmode="decimal"
                    step="0.01"
                    min="0"
                    formControlName="amount"
                    cdkFocusInitial
                />
                <span matSuffix class="pr-3">{{ currency() }}</span>
                @if (form.controls.amount.invalid) {
                    <mat-error>{{
                        'budget.form.amountInvalid' | translate
                    }}</mat-error>
                }
            </mat-form-field>

            @if (errorMessage()) {
                <p role="alert" class="type-body-medium text-error">
                    {{ errorMessage() }}
                </p>
            }
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetFormComponent {
    /** The dialog owns the submit button. */
    readonly formId = input.required<string>();
    readonly currency = input.required<string>();
    /** Minor units; null when there is no limit yet. */
    readonly defaultAmount = input<number | null>(null);
    readonly busy = input<boolean>(false);
    readonly errorMessage = input<string | null>(null);
    /** Minor units. */
    readonly submitted = output<number>();

    readonly form = new FormGroup({
        amount: new FormControl<number | null>(null, {
            validators: [Validators.required, Validators.min(0)],
        }),
    });

    constructor() {
        effect(() => {
            const amount = this.defaultAmount();
            if (amount !== null) this.form.patchValue({ amount: amount / 100 });
        });
    }

    submit(): void {
        if (this.form.invalid || this.busy()) return;
        this.submitted.emit(
            Math.round((this.form.getRawValue().amount ?? 0) * 100),
        );
    }
}
