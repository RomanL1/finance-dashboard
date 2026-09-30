import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../../../components/button/button.component';
import type { HouseholdDto } from '../../household.types';

/** The user's households with the active one marked; picking another one emits its id. */
@Component({
    selector: 'app-household-switcher',
    imports: [ButtonComponent, MatIcon, TranslatePipe],
    template: `
        <ul class="space-y-2">
            @for (household of households(); track household.id) {
                @let active = household.id === activeId();
                <li>
                    <button
                        type="button"
                        class="flex min-h-16 w-full items-center gap-3 rounded-m3-lg border-2 px-4 py-2 text-left"
                        [class]="
                            active
                                ? 'border-primary bg-primary-container text-on-primary-container'
                                : 'border-transparent bg-surface-low text-on-surface'
                        "
                        [attr.aria-current]="active ? 'true' : null"
                        [disabled]="active"
                        (click)="picked.emit(household.id)"
                    >
                        <span class="min-w-0 flex-1">
                            <span
                                class="block truncate"
                                [class]="
                                    active
                                        ? 'type-title-medium'
                                        : 'type-body-large'
                                "
                                >{{ household.name }}</span
                            >
                            <span class="type-body-medium block opacity-80">{{
                                'settings.household.roles.' + household.role
                                    | translate
                            }}</span>
                        </span>
                        @if (active) {
                            <span
                                class="type-label-large flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-on-primary"
                            >
                                <mat-icon
                                    class="size-[18px]!"
                                    svgIcon="check"
                                    aria-hidden="true"
                                />
                                {{ 'settings.households.active' | translate }}
                            </span>
                        }
                    </button>
                </li>
            }
        </ul>
        <app-button
            class="mt-2 block"
            type="button"
            variant="text"
            (clicked)="create.emit()"
        >
            {{ 'settings.households.create' | translate }}
        </app-button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseholdSwitcherComponent {
    readonly households = input.required<HouseholdDto[]>();
    readonly activeId = input.required<string>();
    readonly picked = output<string>();
    readonly create = output<void>();
}
