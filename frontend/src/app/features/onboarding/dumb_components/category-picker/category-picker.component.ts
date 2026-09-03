import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
    signal,
} from '@angular/core';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import {
    ButtonComponent,
    IconButtonComponent,
} from '../../../../components/button/button.component';
import type {
    CategorySelection,
    DefaultCategoryDto,
} from '../../onboarding.types';

/** Always-on fallback bucket. Selected by default and cannot be unchecked. */
const LOCKED_DEFAULT_KEY = 'MISC';

@Component({
    selector: 'app-category-picker',
    imports: [
        MatCheckbox,
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatIcon,
        ButtonComponent,
        IconButtonComponent,
        TranslatePipe,
    ],
    template: `
        <div class="flex flex-col gap-6">
            <p>{{ 'onboarding.categories.description' | translate }}</p>

            <div class="flex flex-col gap-4">
                <app-button
                    type="button"
                    variant="outlined"
                    (clicked)="toggleAll()"
                >
                    {{
                        (allSelected()
                            ? 'onboarding.categories.deselectAll'
                            : 'onboarding.categories.selectAll'
                        ) | translate
                    }}
                </app-button>

                <div class="grid grid-cols-2 gap-x-4 gap-y-3">
                    @for (
                        category of categories();
                        track category.translateKey
                    ) {
                        <mat-checkbox
                            [checked]="selected().has(category.translateKey)"
                            [disabled]="category.translateKey === lockedKey"
                            (change)="toggle(category.translateKey)"
                        >
                            {{
                                'category.default.' + category.translateKey
                                    | translate
                            }}
                        </mat-checkbox>
                    }
                </div>
            </div>

            <hr class="border-t border-slate-200" />

            <div class="flex flex-col gap-3">
                <form
                    [formGroup]="customForm"
                    (ngSubmit)="addCustom()"
                    class="flex items-center gap-3"
                >
                    <mat-form-field class="flex-1">
                        <mat-label>{{
                            'onboarding.categories.customLabel' | translate
                        }}</mat-label>
                        <input
                            matInput
                            formControlName="name"
                            autocomplete="off"
                        />
                    </mat-form-field>
                    <app-button
                        type="submit"
                        variant="outlined"
                        [disabled]="customForm.invalid"
                    >
                        {{ 'onboarding.categories.addButton' | translate }}
                    </app-button>
                </form>

                @if (customNames().length) {
                    <div class="flex flex-wrap gap-2">
                        @for (name of customNames(); track name) {
                            <span
                                class="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm"
                            >
                                {{ name }}
                                <app-icon-button
                                    [ariaLabel]="
                                        'onboarding.categories.removeCustom'
                                            | translate: { name }
                                    "
                                    (clicked)="removeCustom(name)"
                                >
                                    <mat-icon>close</mat-icon>
                                </app-icon-button>
                            </span>
                        }
                    </div>
                }
            </div>

            @if (errorMessage()) {
                <p role="alert" class="text-red-700">{{ errorMessage() }}</p>
            }

            <app-button
                type="button"
                variant="filled"
                [disabled]="busy()"
                (clicked)="submit()"
            >
                {{ 'onboarding.categories.submit' | translate }}
            </app-button>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPickerComponent {
    readonly categories = input.required<DefaultCategoryDto[]>();
    readonly busy = input<boolean>(false);
    readonly errorMessage = input<string | null>(null);
    readonly submitted = output<CategorySelection>();

    readonly lockedKey = LOCKED_DEFAULT_KEY;

    private readonly _selected = signal<ReadonlySet<string>>(
        new Set([LOCKED_DEFAULT_KEY]),
    );
    readonly selected = this._selected.asReadonly();

    private readonly _customNames = signal<readonly string[]>([]);
    readonly customNames = this._customNames.asReadonly();

    readonly allSelected = computed(
        () =>
            this.categories().length > 0 &&
            this.categories().every((c) => this.selected().has(c.translateKey)),
    );

    readonly customForm = new FormGroup({
        name: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
    });

    toggle(translateKey: string): void {
        if (translateKey === LOCKED_DEFAULT_KEY) return;
        const next = new Set(this._selected());
        if (next.has(translateKey)) {
            next.delete(translateKey);
        } else {
            next.add(translateKey);
        }
        this._selected.set(next);
    }

    toggleAll(): void {
        this._selected.set(
            this.allSelected()
                ? new Set([LOCKED_DEFAULT_KEY])
                : new Set(this.categories().map((c) => c.translateKey)),
        );
    }

    addCustom(): void {
        const name = this.customForm.controls.name.value.trim();
        this.customForm.reset();
        if (!name || this._customNames().includes(name)) return;
        this._customNames.set([...this._customNames(), name]);
    }

    removeCustom(name: string): void {
        this._customNames.set(this._customNames().filter((n) => n !== name));
    }

    submit(): void {
        if (this.busy()) return;
        this.submitted.emit({
            translateKeys: [...this.selected()],
            customNames: [...this.customNames()],
        });
    }
}
