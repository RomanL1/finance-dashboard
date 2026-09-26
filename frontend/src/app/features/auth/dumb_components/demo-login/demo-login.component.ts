import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonComponent } from '../../../../components/button/button.component';
import type { DemoUser } from '../../auth.types';

@Component({
    selector: 'app-demo-login',
    imports: [ButtonComponent, TranslatePipe],
    template: `
        <section
            class="flex flex-col gap-2 border-t border-outline-variant pt-4"
            aria-labelledby="demo-login-title"
        >
            <h2
                id="demo-login-title"
                class="type-title-small text-on-surface-variant"
            >
                {{ 'auth.login.demoTitle' | translate }}
            </h2>
            @for (user of users(); track user.email) {
                <app-button
                    variant="outlined"
                    [disabled]="busy()"
                    (clicked)="selected.emit(user)"
                >
                    {{ user.labelKey | translate }}
                </app-button>
            }
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoLoginComponent {
    readonly users = input.required<readonly DemoUser[]>();
    readonly busy = input<boolean>(false);
    readonly selected = output<DemoUser>();
}
