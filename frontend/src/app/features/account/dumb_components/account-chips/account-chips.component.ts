import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AccountBadgeComponent } from '../../../../components/account-badge/account-badge.component';
import { AmountComponent } from '../../../../components/amount/amount.component';
import { IconButtonComponent } from '../../../../components/button/button.component';
import { canSettle, type AccountDto } from '../../account.types';

/** Horizontal row of account balances, bleeding to the viewport edge on phones. A credit card with debt offers to settle it. */
@Component({
    selector: 'app-account-chips',
    imports: [
        AccountBadgeComponent,
        AmountComponent,
        IconButtonComponent,
        MatIcon,
        TranslatePipe,
    ],
    template: `
        @if (accounts().length === 0) {
            <p class="type-body-medium text-on-surface-variant">
                {{ 'account.list.empty' | translate }}
            </p>
        } @else {
            <ul
                class="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
                [attr.aria-label]="'account.chips.label' | translate"
            >
                @for (account of accounts(); track account.id) {
                    <li
                        class="flex shrink-0 snap-start items-center gap-3 rounded-full bg-surface-high py-2 pr-4 pl-2"
                        [class.!pr-1]="settleable(account)"
                    >
                        <app-account-badge [number]="account.number" />
                        <div class="flex flex-col">
                            <span
                                class="type-label-large max-w-[14ch] truncate text-on-surface"
                            >
                                {{ account.description }}
                            </span>
                            <app-amount
                                [amount]="account.amount"
                                kind="balance"
                                [currency]="account.currency"
                                [showPlus]="false"
                            />
                        </div>
                        @if (settleable(account)) {
                            <app-icon-button
                                [ariaLabel]="
                                    'transfer.settle.action'
                                        | translate
                                            : { name: account.description }
                                "
                                (clicked)="settle.emit(account.id)"
                            >
                                <mat-icon svgIcon="payments" />
                            </app-icon-button>
                        }
                    </li>
                }
            </ul>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountChipsComponent {
    readonly accounts = input.required<AccountDto[]>();
    /** Pay off a credit card's debt from another account. */
    readonly settle = output<string>();

    protected settleable(account: AccountDto): boolean {
        return canSettle(account);
    }
}
