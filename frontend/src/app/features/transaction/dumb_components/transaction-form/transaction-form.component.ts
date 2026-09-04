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
    MatButtonToggle,
    MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import { MatOption } from '@angular/material/core';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import type { AccountDto, CategoryDto } from '../../../../core/api';
import type {
    CreateTransactionDto,
    TransactionDefaults,
} from '../../transaction.types';

/** Local wall-clock time as `YYYY-MM-DDTHH:mm`, what `<input type="datetime-local">` expects. */
function toLocalDateTime(instant: Date): string {
    const offsetMs = instant.getTimezoneOffset() * 60_000;
    return new Date(instant.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** Fields only; the owning dialog renders the actions and calls `submit()`. */
@Component({
    selector: 'app-transaction-form',
    imports: [
        ReactiveFormsModule,
        MatButtonToggleGroup,
        MatButtonToggle,
        MatFormField,
        MatLabel,
        MatInput,
        MatError,
        MatSelect,
        MatOption,
        TranslatePipe,
    ],
    template: `
        <form
            [id]="formId()"
            [formGroup]="form"
            (ngSubmit)="submit()"
            class="flex flex-col gap-4"
        >
            <mat-button-toggle-group
                formControlName="type"
                class="w-full"
                [attr.aria-label]="'transaction.form.typeLabel' | translate"
            >
                <mat-button-toggle value="expense" class="flex-1"
                    >{{ 'transaction.form.expense' | translate }}
                </mat-button-toggle>
                <mat-button-toggle value="income" class="income flex-1"
                    >{{ 'transaction.form.income' | translate }}
                </mat-button-toggle>
            </mat-button-toggle-group>

            <mat-form-field>
                <mat-label
                    >{{ 'transaction.form.amountLabel' | translate }}
                </mat-label>
                <input
                    matInput
                    type="number"
                    inputmode="decimal"
                    step="0.01"
                    min="0.01"
                    formControlName="amount"
                    cdkFocusInitial
                />
                @if (form.controls.amount.invalid) {
                    <mat-error
                        >{{ 'transaction.form.amountRequired' | translate }}
                    </mat-error>
                }
            </mat-form-field>

            <mat-form-field>
                <mat-label
                    >{{ 'transaction.form.accountLabel' | translate }}
                </mat-label>
                <mat-select formControlName="accountId">
                    @for (account of accounts(); track account.id) {
                        <mat-option [value]="account.id"
                            >{{ account.description }} ({{ account.currency }})
                        </mat-option>
                    }
                </mat-select>
            </mat-form-field>

            <mat-form-field>
                <mat-label
                    >{{ 'transaction.form.categoryLabel' | translate }}
                </mat-label>
                <mat-select formControlName="categoryId">
                    <mat-option [value]="null"
                        >{{ 'transaction.form.noCategory' | translate }}
                    </mat-option>
                    @for (category of categories(); track category.id) {
                        <mat-option [value]="category.id"
                            >{{ category.name }}
                        </mat-option>
                    }
                </mat-select>
            </mat-form-field>

            <mat-form-field>
                <mat-label
                    >{{ 'transaction.form.titleLabel' | translate }}
                </mat-label>
                <input matInput formControlName="title" autocomplete="off" />
            </mat-form-field>

            <mat-form-field>
                <mat-label
                    >{{ 'transaction.form.dateLabel' | translate }}
                </mat-label>
                <input matInput type="datetime-local" formControlName="date" />
            </mat-form-field>

            <mat-form-field>
                <mat-label
                    >{{ 'transaction.form.descriptionLabel' | translate }}
                </mat-label>
                <textarea
                    matInput
                    rows="2"
                    formControlName="description"
                ></textarea>
            </mat-form-field>
        </form>
    `,
    styles: `
        /* Same green as income rows in the list. */
        .income {
            --mat-button-toggle-text-color: var(--color-green-700);
            --mat-button-toggle-selected-state-text-color: var(
                --color-green-700
            );
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionFormComponent {
    readonly formId = input<string>('transaction-form');
    readonly accounts = input.required<AccountDto[]>();
    readonly categories = input.required<CategoryDto[]>();
    readonly defaults = input<TransactionDefaults>({});
    readonly submitted = output<CreateTransactionDto>();

    readonly form = new FormGroup({
        type: new FormControl<'expense' | 'income'>('expense', {
            nonNullable: true,
        }),
        amount: new FormControl<number | null>(null, {
            validators: [Validators.required, Validators.min(0.01)],
        }),
        title: new FormControl('', { nonNullable: true }),
        categoryId: new FormControl<string | null>(null),
        accountId: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        date: new FormControl(toLocalDateTime(new Date()), {
            nonNullable: true,
            validators: [Validators.required],
        }),
        description: new FormControl('', { nonNullable: true }),
    });

    /** Preselect last-used account and category; fall back to the only account. Editing prefills the rest. */
    constructor() {
        effect(() => {
            const d = this.defaults();
            this.form.patchValue({
                ...(d.type && { type: d.type }),
                ...(d.amount != null && { amount: d.amount / 100 }),
                ...(d.title != null && { title: d.title }),
                ...(d.description != null && { description: d.description }),
                ...(d.date && { date: toLocalDateTime(new Date(d.date)) }),
            });
        });
        effect(() => {
            const accounts = this.accounts();
            const defaults = this.defaults();
            const account =
                accounts.find((a) => a.id === defaults.accountId) ??
                (accounts.length === 1 ? accounts[0] : undefined);
            if (account) this.form.controls.accountId.setValue(account.id);
        });
        effect(() => {
            const categoryId = this.defaults().categoryId;
            if (this.categories().some((c) => c.id === categoryId)) {
                this.form.controls.categoryId.setValue(categoryId ?? null);
            }
        });
    }

    submit(): void {
        if (this.form.invalid) return;
        const value = this.form.getRawValue();
        this.submitted.emit({
            type: value.type,
            amount: Math.round((value.amount ?? 0) * 100),
            title: value.title.trim() || null,
            categoryId: value.categoryId,
            accountId: value.accountId,
            /** datetime-local has no zone: parses as local, sent as UTC instant. */
            date: new Date(value.date).toISOString(),
            description: value.description.trim() || null,
        });
    }
}
