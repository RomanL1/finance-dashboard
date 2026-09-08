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
import type { CategoryDto, CreateCategoryDto } from '../../category.types';

@Component({
    selector: 'app-category-form',
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
            [id]="formId()"
            [formGroup]="form"
            (ngSubmit)="submit()"
            class="flex flex-col gap-4"
        >
            <mat-form-field class="flex flex-col gap-1">
                <mat-label>{{
                    'category.form.nameLabel' | translate
                }}</mat-label>
                <input
                    matInput
                    formControlName="name"
                    autocomplete="off"
                    maxlength="100"
                    cdkFocusInitial
                />
                @if (form.controls.name.hasError('required')) {
                    <mat-error>{{
                        'category.form.nameRequired' | translate
                    }}</mat-error>
                }
            </mat-form-field>

            @if (errorMessage()) {
                <p role="alert" class="text-red-700">{{ errorMessage() }}</p>
            }

            @if (!formId()) {
                <app-button
                    type="submit"
                    variant="filled"
                    [disabled]="form.invalid || busy()"
                >
                    {{ 'category.form.submit' | translate }}
                </app-button>
            }
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormComponent {
    /** Set when a dialog owns the submit button; hides the inline one. */
    readonly formId = input<string | null>(null);
    /** Prefill when renaming. */
    readonly defaults = input<CategoryDto | null>(null);
    readonly busy = input<boolean>(false);
    readonly errorMessage = input<string | null>(null);
    readonly submitted = output<CreateCategoryDto>();

    readonly form = new FormGroup({
        name: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.maxLength(100)],
        }),
    });

    constructor() {
        effect(() => {
            const d = this.defaults();
            if (d) this.form.patchValue({ name: d.name });
        });
    }

    submit(): void {
        if (this.form.invalid || this.busy()) return;
        const name = this.form.getRawValue().name.trim();
        if (!name) return;
        this.submitted.emit({ name });
    }
}
