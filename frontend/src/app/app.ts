import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
    }
}
