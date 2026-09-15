import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatOption } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import type { AccountDto, CategoryDto } from '../../../../core/api';
import { UNCATEGORIZED, type TransactionFilter } from '../../transaction.types';

/** Account and category selects; every change emits the whole filter. Archived accounts stay listed: history is history. */
@Component({
    selector: 'app-transaction-filter',
    imports: [MatFormField, MatLabel, MatSelect, MatOption, TranslatePipe],
    template: `
        <div class="grid grid-cols-2 gap-3">
            <mat-form-field subscriptSizing="dynamic">
                <mat-label>{{
                    'transaction.filter.account' | translate
                }}</mat-label>
                <mat-select
                    [value]="filter().accountId ?? ALL"
                    (valueChange)="setAccount($event)"
                >
                    <mat-option [value]="ALL">{{
                        'transaction.filter.all' | translate
                    }}</mat-option>
                    @for (account of accounts(); track account.id) {
                        <mat-option [value]="account.id">{{
                            account.description
                        }}</mat-option>
                    }
                </mat-select>
            </mat-form-field>

            <mat-form-field subscriptSizing="dynamic">
                <mat-label>{{
                    'transaction.filter.category' | translate
                }}</mat-label>
                <mat-select
                    [value]="filter().categoryId ?? ALL"
                    (valueChange)="setCategory($event)"
                >
                    <mat-option [value]="ALL">{{
                        'transaction.filter.all' | translate
                    }}</mat-option>
                    <mat-option [value]="UNCATEGORIZED">{{
                        'transaction.list.uncategorized' | translate
                    }}</mat-option>
                    @for (category of categories(); track category.id) {
                        <mat-option [value]="category.id">{{
                            category.name
                        }}</mat-option>
                    }
                </mat-select>
            </mat-form-field>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionFilterComponent {
    readonly accounts = input.required<AccountDto[]>();
    readonly categories = input.required<CategoryDto[]>();
    readonly filter = input.required<TransactionFilter>();
    readonly filterChange = output<TransactionFilter>();

    /** `mat-select` needs a value for "no restriction"; never leaves this component. */
    protected readonly ALL = '';
    protected readonly UNCATEGORIZED = UNCATEGORIZED;

    protected setAccount(accountId: string): void {
        this.filterChange.emit({
            ...this.filter(),
            accountId: accountId || undefined,
        });
    }

    protected setCategory(categoryId: string): void {
        this.filterChange.emit({
            ...this.filter(),
            categoryId: categoryId || undefined,
        });
    }
}
