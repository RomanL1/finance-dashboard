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
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../../../components/button/button.component';

@Component({
    selector: 'app-household-form',
    imports: [
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatError,
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
                    'onboarding.household.nameLabel' | translate
                }}</mat-label>
                <input matInput formControlName="name" autocomplete="off" />
                @if (form.controls.name.hasError('required')) {
                    <mat-error>{{
                        'onboarding.household.nameRequired' | translate
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
                {{ 'onboarding.household.next' | translate }}
            </app-button>
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdFormComponent {
    readonly initialName = input<string>('');
    readonly busy = input<boolean>(false);
    readonly errorMessage = input<string | null>(null);
    readonly submitted = output<string>();

    readonly form = new FormGroup({
        name: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
    });

    /** Prefills the name control once the current household name is available. */
    constructor() {
        effect(() => {
            const name = this.initialName();
            if (name) this.form.controls.name.setValue(name);
        });
    }

    submit(): void {
        if (this.form.invalid || this.busy()) return;
        this.submitted.emit(this.form.getRawValue().name);
    }
}
