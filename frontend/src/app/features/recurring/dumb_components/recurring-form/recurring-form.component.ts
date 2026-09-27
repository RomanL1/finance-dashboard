import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    Inject,
    input,
    LOCALE_ID,
    output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { MatCheckbox } from '@angular/material/checkbox';
import { MatOption } from '@angular/material/core';
import {
    MatError,
    MatFormField,
    MatHint,
    MatLabel,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import type { AccountDto, CategoryDto } from '../../../../core/api';
import { isActiveAccount } from '../../../account/account.types';
import {
    isMonthBased,
    isoWeekdayOf,
    parseLocalDate,
    RECURRENCE_INTERVALS,
    toLocalDateString,
    WEEKDAYS,
    weekdayName,
    type RecurrenceInterval,
    type RecurringTransactionDto,
    type SaveRecurringTransactionDto,
} from '../../recurring.types';

/** Fields only; the owning dialog renders the actions and calls `submit()`. */
@Component({
    selector: 'app-recurring-form',
    imports: [
        ReactiveFormsModule,
        MatButtonToggleGroup,
        MatButtonToggle,
        MatCheckbox,
        MatFormField,
        MatLabel,
        MatHint,
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
                @if (form.controls.varyingAmount.value) {
                    <mat-hint>{{
                        'recurring.form.amountVaryingHint' | translate
                    }}</mat-hint>
                }
                @if (form.controls.amount.invalid) {
                    <mat-error
                        >{{ 'transaction.form.amountRequired' | translate }}
                    </mat-error>
                }
            </mat-form-field>

            <mat-checkbox formControlName="varyingAmount">
                {{ 'recurring.form.varyingAmount' | translate }}
            </mat-checkbox>

            <mat-form-field>
                <mat-label
                    >{{ 'transaction.form.accountLabel' | translate }}
                </mat-label>
                <mat-select formControlName="accountId">
                    @for (account of activeAccounts(); track account.id) {
                        <mat-option [value]="account.id"
                            >{{ account.description }}
                        </mat-option>
                    }
                </mat-select>
                @if (form.controls.accountId.invalid) {
                    <mat-error>{{
                        'recurring.form.accountRequired' | translate
                    }}</mat-error>
                }
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
                <mat-label>{{
                    'recurring.form.intervalLabel' | translate
                }}</mat-label>
                <mat-select formControlName="interval">
                    @for (interval of intervals; track interval) {
                        <mat-option [value]="interval">{{
                            'recurring.interval.' + interval | translate
                        }}</mat-option>
                    }
                </mat-select>
            </mat-form-field>

            <mat-form-field>
                <mat-label>{{
                    'recurring.form.startDateLabel' | translate
                }}</mat-label>
                <input
                    matInput
                    type="date"
                    formControlName="startDate"
                    [min]="earliestStart"
                />
                @if (form.controls.startDate.invalid) {
                    <mat-error>{{
                        'recurring.form.startDateInvalid' | translate
                    }}</mat-error>
                } @else if (backfills()) {
                    <mat-hint>{{
                        'recurring.form.backfillHint' | translate
                    }}</mat-hint>
                }
            </mat-form-field>

            @if (interval() === 'weekly') {
                <mat-form-field>
                    <mat-label>{{
                        'recurring.form.weekdayLabel' | translate
                    }}</mat-label>
                    <mat-select formControlName="weekday">
                        @for (day of weekdays; track day) {
                            <mat-option [value]="day">{{
                                weekdayLabel(day)
                            }}</mat-option>
                        }
                    </mat-select>
                </mat-form-field>
            }

            @if (monthBased()) {
                <mat-form-field>
                    <mat-label>{{
                        'recurring.form.dayOfMonthLabel' | translate
                    }}</mat-label>
                    <input
                        matInput
                        type="number"
                        inputmode="numeric"
                        min="1"
                        max="31"
                        step="1"
                        formControlName="dayOfMonth"
                    />
                    @if (form.controls.dayOfMonth.invalid) {
                        <mat-error>{{
                            'recurring.form.dayOfMonthInvalid' | translate
                        }}</mat-error>
                    } @else {
                        <mat-hint>{{
                            'recurring.form.dayOfMonthHint' | translate
                        }}</mat-hint>
                    }
                </mat-form-field>

                <mat-checkbox formControlName="weekendShift">
                    {{ 'recurring.form.weekendShift' | translate }}
                </mat-checkbox>
            }

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
        /* Same green as income amounts everywhere else. */
        .income {
            --mat-button-toggle-text-color: var(--app-income);
            --mat-button-toggle-selected-state-text-color: var(--app-income);
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringFormComponent {
    readonly formId = input<string>('recurring-form');
    readonly accounts = input.required<AccountDto[]>();
    readonly categories = input.required<CategoryDto[]>();
    /** Edit mode prefills from the rule. */
    readonly rule = input<RecurringTransactionDto | undefined>(undefined);
    readonly submitted = output<SaveRecurringTransactionDto>();

    protected readonly intervals = RECURRENCE_INTERVALS;
    protected readonly weekdays = WEEKDAYS;
    private readonly today = toLocalDateString(new Date());
    /** The server books at most a year back. */
    protected readonly earliestStart = toLocalDateString(
        new Date(
            new Date().getFullYear() - 1,
            new Date().getMonth(),
            new Date().getDate(),
        ),
    );

    readonly form = new FormGroup({
        type: new FormControl<'expense' | 'income'>('expense', {
            nonNullable: true,
        }),
        amount: new FormControl<number | null>(null, {
            validators: [Validators.required, Validators.min(0.01)],
        }),
        varyingAmount: new FormControl(false, { nonNullable: true }),
        accountId: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        categoryId: new FormControl<string | null>(null),
        title: new FormControl('', { nonNullable: true }),
        interval: new FormControl<RecurrenceInterval>('monthly', {
            nonNullable: true,
        }),
        startDate: new FormControl(this.today, {
            nonNullable: true,
            validators: [Validators.required],
        }),
        weekday: new FormControl<number>(isoWeekdayOf(this.today), {
            nonNullable: true,
        }),
        dayOfMonth: new FormControl<number | null>(
            parseLocalDate(this.today).getDate(),
            {
                validators: [
                    Validators.required,
                    Validators.min(1),
                    Validators.max(31),
                    Validators.pattern(/^\d+$/),
                ],
            },
        ),
        weekendShift: new FormControl(false, { nonNullable: true }),
        description: new FormControl('', { nonNullable: true }),
    });

    protected readonly interval = toSignal(
        this.form.controls.interval.valueChanges,
        { initialValue: this.form.controls.interval.value },
    );
    protected readonly monthBased = computed(() =>
        isMonthBased(this.interval()),
    );
    private readonly startDate = toSignal(
        this.form.controls.startDate.valueChanges,
        { initialValue: this.form.controls.startDate.value },
    );
    /** New rule starting in the past: the server books the missed occurrences at once. */
    protected readonly backfills = computed(
        () =>
            !this.rule() && !!this.startDate() && this.startDate() < this.today,
    );

    /** Archived accounts take no new bookings; an edited rule keeps showing its own. */
    readonly activeAccounts = computed(() =>
        this.accounts().filter(
            (a) => isActiveAccount(a) || a.id === this.rule()?.accountId,
        ),
    );

    constructor(@Inject(LOCALE_ID) private readonly locale: string) {
        effect(() => {
            const rule = this.rule();
            if (!rule) return;
            this.form.patchValue({
                type: rule.type as 'expense' | 'income',
                amount: rule.amount / 100,
                varyingAmount: rule.varyingAmount,
                accountId: rule.accountId,
                categoryId: rule.categoryId,
                title: rule.title ?? '',
                interval: rule.interval as RecurrenceInterval,
                startDate: rule.startDate,
                weekday: rule.weekday ?? isoWeekdayOf(rule.startDate),
                dayOfMonth:
                    rule.dayOfMonth ?? parseLocalDate(rule.startDate).getDate(),
                weekendShift: rule.weekendShift,
                description: rule.description ?? '',
            });
            this.form.markAsPristine();
        });
        // A single active account is the obvious choice.
        effect(() => {
            const accounts = this.activeAccounts();
            const control = this.form.controls.accountId;
            if (!control.value && accounts.length === 1) {
                control.setValue(accounts[0]!.id);
            }
        });
        // Anchors follow the start date until the user picks one (story C7).
        this.form.controls.startDate.valueChanges.subscribe((date) => {
            if (!date) return;
            const { weekday, dayOfMonth } = this.form.controls;
            if (!weekday.dirty) weekday.setValue(isoWeekdayOf(date));
            if (!dayOfMonth.dirty) {
                dayOfMonth.setValue(parseLocalDate(date).getDate());
            }
        });
        // Only month-based intervals need (and validate) the day of month.
        this.form.controls.interval.valueChanges.subscribe((interval) => {
            const control = this.form.controls.dayOfMonth;
            if (isMonthBased(interval)) control.enable();
            else control.disable();
        });
    }

    protected weekdayLabel(day: number): string {
        return weekdayName(day, this.locale);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        const monthBased = isMonthBased(value.interval);
        this.submitted.emit({
            type: value.type,
            amount: Math.round((value.amount ?? 0) * 100),
            varyingAmount: value.varyingAmount,
            accountId: value.accountId,
            categoryId: value.categoryId,
            title: value.title.trim() || null,
            description: value.description.trim() || null,
            interval: value.interval,
            startDate: value.startDate,
            weekday: value.interval === 'weekly' ? value.weekday : null,
            dayOfMonth: monthBased ? value.dayOfMonth : null,
            weekendShift: monthBased && value.weekendShift,
        });
    }
}
