import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    input,
    output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import type { AccountDto } from '../../../../core/api';
import { isActiveAccount } from '../../../account/account.types';
import type { CreateTransferDto, TransferDefaults } from '../../transfer.types';

/** Local wall-clock time as `YYYY-MM-DDTHH:mm`, what `<input type="datetime-local">` expects. */
function toLocalDateTime(instant: Date): string {
    const offsetMs = instant.getTimezoneOffset() * 60_000;
    return new Date(instant.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** Fields only; the owning dialog renders the actions and calls `submit()`. */
@Component({
    selector: 'app-transfer-form',
    imports: [
        ReactiveFormsModule,
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
            <mat-form-field>
                <mat-label>{{
                    'transfer.form.amountLabel' | translate
                }}</mat-label>
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
                    <mat-error>{{
                        'transfer.form.amountRequired' | translate
                    }}</mat-error>
                }
            </mat-form-field>

            <mat-form-field>
                <mat-label>{{
                    'transfer.form.fromLabel' | translate
                }}</mat-label>
                <mat-select formControlName="fromAccountId">
                    @for (account of fromAccounts(); track account.id) {
                        <mat-option [value]="account.id">{{
                            account.description
                        }}</mat-option>
                    }
                </mat-select>
                @if (form.controls.fromAccountId.invalid) {
                    <mat-error>{{
                        'transfer.form.accountRequired' | translate
                    }}</mat-error>
                }
            </mat-form-field>

            <mat-form-field>
                <mat-label>{{ 'transfer.form.toLabel' | translate }}</mat-label>
                <mat-select formControlName="toAccountId">
                    @for (account of toAccounts(); track account.id) {
                        <mat-option [value]="account.id">{{
                            account.description
                        }}</mat-option>
                    }
                </mat-select>
                @if (form.controls.toAccountId.invalid) {
                    <mat-error>{{
                        'transfer.form.accountRequired' | translate
                    }}</mat-error>
                }
            </mat-form-field>

            <mat-form-field>
                <mat-label>{{
                    'transfer.form.dateLabel' | translate
                }}</mat-label>
                <input matInput type="datetime-local" formControlName="date" />
            </mat-form-field>

            <mat-form-field>
                <mat-label>{{
                    'transfer.form.titleLabel' | translate
                }}</mat-label>
                <input matInput formControlName="title" autocomplete="off" />
            </mat-form-field>
        </form>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferFormComponent {
    readonly formId = input<string>('transfer-form');
    readonly accounts = input.required<AccountDto[]>();
    readonly defaults = input<TransferDefaults>({});
    readonly submitted = output<CreateTransferDto>();

    readonly form = new FormGroup({
        amount: new FormControl<number | null>(null, {
            validators: [Validators.required, Validators.min(0.01)],
        }),
        fromAccountId: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        toAccountId: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        date: new FormControl(toLocalDateTime(new Date()), {
            nonNullable: true,
            validators: [Validators.required],
        }),
        title: new FormControl('', { nonNullable: true }),
    });

    private readonly date = toSignal(this.form.controls.date.valueChanges, {
        initialValue: this.form.controls.date.value,
    });
    private readonly fromId = toSignal(
        this.form.controls.fromAccountId.valueChanges,
        { initialValue: this.form.controls.fromAccountId.value },
    );

    /** Accounts not archived at the transfer's date. Changing the date can drop a selected one. */
    readonly activeAccounts = computed(() => {
        const at = new Date(this.date());
        return this.accounts().filter((a) => isActiveAccount(a, at));
    });

    readonly fromAccounts = this.activeAccounts;

    /** Never the paying account: money cannot move to where it comes from. */
    readonly toAccounts = computed(() =>
        this.activeAccounts().filter((a) => a.id !== this.fromId()),
    );

    /** Prefill from the defaults; keep a selection while it stays valid, else fall back to the defaults or the only choice. */
    constructor() {
        effect(() => {
            const d = this.defaults();
            this.form.patchValue({
                ...(d.amount != null && { amount: d.amount / 100 }),
                ...(d.title != null && { title: d.title }),
                ...(d.date && { date: toLocalDateTime(new Date(d.date)) }),
            });
        });
        effect(() => {
            pick(
                this.form.controls.toAccountId,
                this.toAccounts(),
                this.defaults().toAccountId,
            );
        });
        effect(() => {
            // The receiver is fixed first (settling picks the card), so the payer avoids it.
            const toId = this.defaults().toAccountId;
            pick(
                this.form.controls.fromAccountId,
                this.fromAccounts().filter((a) => a.id !== toId),
                this.defaults().fromAccountId,
            );
        });
    }

    submit(): void {
        if (this.form.invalid) return;
        const value = this.form.getRawValue();
        this.submitted.emit({
            fromAccountId: value.fromAccountId,
            toAccountId: value.toAccountId,
            amount: Math.round((value.amount ?? 0) * 100),
            title: value.title.trim() || null,
            /** datetime-local has no zone: parses as local, sent as UTC instant. */
            date: new Date(value.date).toISOString(),
        });
    }
}

/** Keeps the control's account while it is among `options`; otherwise the default, the only option, or empty. */
function pick(
    control: FormControl<string>,
    options: AccountDto[],
    defaultId: string | undefined,
): void {
    if (options.some((a) => a.id === control.value)) return;
    const account =
        options.find((a) => a.id === defaultId) ??
        (options.length === 1 ? options[0] : undefined);
    control.setValue(account?.id ?? '');
}
