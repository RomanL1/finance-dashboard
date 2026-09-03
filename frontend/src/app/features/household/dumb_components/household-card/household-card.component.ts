import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { HouseholdMineResponse } from '../../household.types';

@Component({
    selector: 'app-household-card',
    template: `
        <dl class="grid grid-cols-2 gap-2">
            <dt>Haushalt</dt>
            <dd>{{ household().name }}</dd>
            <dt>Währung</dt>
            <dd>{{ household().currency }}</dd>
            <dt>Rolle</dt>
            <dd>{{ household().role }}</dd>
        </dl>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdCardComponent {
    readonly household = input.required<HouseholdMineResponse>();
}
