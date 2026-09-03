import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { AccountDto } from '../../account.types';

@Component({
    selector: 'app-account-list',
    imports: [DecimalPipe, TranslatePipe],
    template: `
        @if (accounts().length === 0) {
            <p>{{ 'account.list.empty' | translate }}</p>
        } @else {
            <table class="w-full text-left">
                <thead>
                    <tr>
                        <th>{{ 'account.list.description' | translate }}</th>
                        <th>{{ 'account.list.currency' | translate }}</th>
                        <th>{{ 'account.list.amount' | translate }}</th>
                    </tr>
                </thead>
                <tbody>
                    @for (account of accounts(); track account.id) {
                        <tr>
                            <td>{{ account.description }}</td>
                            <td>{{ account.currency }}</td>
                            <td>
                                {{ account.amount / 100 | number: '1.2-2' }}
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountListComponent {
    readonly accounts = input.required<AccountDto[]>();
}
