import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Loading placeholders shaped like the content they stand in for. Pulse stops under reduced motion. */
@Component({
    selector: 'app-skeleton',
    template: `
        <div class="animate-pulse" aria-hidden="true">
            @switch (variant()) {
                @case ('stat-card') {
                    <div class="h-28 rounded-m3-lg bg-surface-highest"></div>
                }
                @case ('chips') {
                    <div class="flex gap-2">
                        <div
                            class="h-12 w-40 rounded-full bg-surface-highest"
                        ></div>
                        <div
                            class="h-12 w-40 rounded-full bg-surface-highest"
                        ></div>
                    </div>
                }
                @case ('list') {
                    <div class="space-y-3">
                        @for (i of rows; track i) {
                            <div class="flex items-center gap-3">
                                <div
                                    class="h-10 w-10 rounded-full bg-surface-highest"
                                ></div>
                                <div class="flex-1 space-y-2">
                                    <div
                                        class="h-3.5 w-2/3 rounded bg-surface-highest"
                                    ></div>
                                    <div
                                        class="h-3 w-1/3 rounded bg-surface-highest"
                                    ></div>
                                </div>
                                <div
                                    class="h-3.5 w-16 rounded bg-surface-highest"
                                ></div>
                            </div>
                        }
                    </div>
                }
            }
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
    readonly variant = input.required<'stat-card' | 'chips' | 'list'>();
    protected readonly rows = [0, 1, 2, 3, 4];
}
