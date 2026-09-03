import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { HouseholdMineResponse } from '../../household.types';

@Component({
    selector: 'app-household-card',
    imports: [TranslatePipe],
    template: `
        <dl class="grid grid-cols-2 gap-2">
            <dt>{{ 'household.card.household' | translate }}</dt>
            <dd>{{ household().name }}</dd>
            <dt>{{ 'household.card.currency' | translate }}</dt>
            <dd>{{ household().currency }}</dd>
            <dt>{{ 'household.card.role' | translate }}</dt>
            <dd>{{ household().role }}</dd>
        </dl>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdCardComponent {
    readonly household = input.required<HouseholdMineResponse>();
}
