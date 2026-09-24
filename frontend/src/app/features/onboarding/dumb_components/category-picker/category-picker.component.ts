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

/** Suggested catch-all, ticked at the start like any other suggestion. Transactions without a category need none (ADR-1). */
const DEFAULT_SELECTED_KEY = 'MISC';

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

            <hr class="border-t border-outline-variant" />

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
                                class="inline-flex items-center gap-1 rounded-full bg-surface-high py-1 pl-3 pr-1 type-label-large text-on-surface"
                            >
                                {{ name }}
                                <app-icon-button
                                    [ariaLabel]="
                                        'onboarding.categories.removeCustom'
                                            | translate: { name }
                                    "
                                    (clicked)="removeCustom(name)"
                                >
                                    <mat-icon svgIcon="close" />
                                </app-icon-button>
                            </span>
                        }
                    </div>
                }
            </div>

            @if (errorMessage()) {
                <p role="alert" class="type-body-medium text-error">
                    {{ errorMessage() }}
                </p>
            }

            <app-button
                type="button"
                variant="filled"
                [disabled]="busy() || !hasSelection()"
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

    private readonly _selected = signal<ReadonlySet<string>>(
        new Set([DEFAULT_SELECTED_KEY]),
    );
    readonly selected = this._selected.asReadonly();

    private readonly _customNames = signal<readonly string[]>([]);
    readonly customNames = this._customNames.asReadonly();

    readonly allSelected = computed(
        () =>
            this.categories().length > 0 &&
            this.categories().every((c) => this.selected().has(c.translateKey)),
    );

    /** The household needs at least one category; the server rejects an empty list. */
    readonly hasSelection = computed(
        () => this.selected().size > 0 || this.customNames().length > 0,
    );

    readonly customForm = new FormGroup({
        name: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
    });

    toggle(translateKey: string): void {
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
                ? new Set<string>()
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
        if (this.busy() || !this.hasSelection()) return;
        this.submitted.emit({
            translateKeys: [...this.selected()],
            customNames: [...this.customNames()],
        });
    }
}
