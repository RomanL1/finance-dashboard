import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ThemeService } from './core/theme/theme.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    template: '<router-outlet />',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
    constructor() {
        /** Instantiated here so the stored theme applies before the first route renders. */
        inject(ThemeService);
        /** Created at boot so the translation file loads alongside the route guards,
         *  not after the first lazy page asks for it. */
        inject(TranslateService);
    }
}
