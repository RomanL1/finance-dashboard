import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, switchMap, timer } from 'rxjs';

/** Long enough for the first page to finish its own requests on a slow mobile connection. */
export const PRELOAD_DELAY_MS = 3000;

/**
 * Preloads every lazy route like `PreloadAllModules`, but only after a delay, so chunks for
 * other tabs (chart.js and friends) do not compete for bandwidth with the first page.
 */
@Injectable({ providedIn: 'root' })
export class DelayedPreloadingStrategy implements PreloadingStrategy {
    preload(
        _route: Route,
        load: () => Observable<unknown>,
    ): Observable<unknown> {
        return timer(PRELOAD_DELAY_MS).pipe(switchMap(() => load()));
    }
}
