import { formatNumber } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    LOCALE_ID,
    OnDestroy,
    viewChild,
} from '@angular/core';
import {
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    LinearScale,
    Tooltip,
    type ChartConfiguration,
    type Plugin,
} from 'chart.js';
import { categorySchemeColor } from '../../../../components/category-avatar/category-color';
import type { CategoryBar } from '../../analytics.types';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const ROW_HEIGHT = 36;
const AXIS_HEIGHT = 16;
const MAX_LABEL = 18;
const VALUE_GAP = 6;

/** Value at the end of each bar, in text ink. The x axis is hidden: the labels carry the numbers. */
function valueLabels(
    labels: string[],
    ink: string,
    font: string,
): Plugin<'bar'> {
    return {
        id: 'valueLabels',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            const meta = chart.getDatasetMeta(0);
            ctx.save();
            ctx.fillStyle = ink;
            ctx.font = font;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            meta.data.forEach((bar, index) => {
                ctx.fillText(labels[index] ?? '', bar.x + VALUE_GAP, bar.y);
            });
            ctx.restore();
        },
    };
}

/**
 * Horizontal bars, one per category, largest first, the amount written at each bar's end.
 * Bar hue matches the category avatar, so the list and the chart share one identity system.
 * A visually hidden table carries the same numbers for screen readers; the canvas itself is decorative.
 */
@Component({
    selector: 'app-category-bar-chart',
    template: `
        <!-- The wrapper's computed color/border resolve Material's light-dark() tokens for the canvas. -->
        <div
            #frame
            class="relative w-full border-0 border-outline-variant text-on-surface-variant"
            [style.height.px]="height()"
        >
            <canvas #canvas [attr.aria-label]="label()" role="img"></canvas>
        </div>
        <!-- sr-only on a wrapper: a caption renders outside the table box and would escape the clip. -->
        <div class="sr-only">
            <table>
                <caption>
                    {{
                        label()
                    }}
                </caption>
                <tbody>
                    @for (bar of bars(); track bar.categoryId) {
                        <tr>
                            <th scope="row">{{ bar.label }}</th>
                            <td>
                                {{ format(bar.expenses, 2) }} {{ currency() }}
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBarChartComponent implements OnDestroy {
    readonly bars = input.required<CategoryBar[]>();
    readonly currency = input.required<string>();
    /** Accessible name of the chart. */
    readonly label = input.required<string>();
    /** Canvas cannot follow `color-scheme`, so the page tells it what is on screen. */
    readonly scheme = input<'light' | 'dark'>('light');

    private readonly canvas =
        viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
    private readonly frame =
        viewChild.required<ElementRef<HTMLElement>>('frame');
    private readonly locale = inject(LOCALE_ID);
    private chart: Chart<'bar'> | null = null;

    protected readonly height = computed(
        () => this.bars().length * ROW_HEIGHT + AXIS_HEIGHT,
    );

    constructor() {
        effect(() => {
            const config = this.config(this.bars(), this.scheme());
            if (this.chart) {
                this.chart.data = config.data;
                this.chart.options = config.options ?? {};
                this.chart.update();
                return;
            }
            const canvas = this.canvas().nativeElement;
            // jsdom and other headless hosts have no 2D context: the table alone stands in.
            if (!canvas.getContext('2d')) return;
            this.chart = new Chart(canvas, config);
        });
    }

    ngOnDestroy(): void {
        this.chart?.destroy();
        this.chart = null;
    }

    protected format(minor: number, decimals: 0 | 2): string {
        return formatNumber(
            minor / 100,
            this.locale,
            `1.${decimals}-${decimals}`,
        );
    }

    private config(
        bars: CategoryBar[],
        scheme: 'light' | 'dark',
    ): ChartConfiguration<'bar'> {
        const styles = getComputedStyle(this.frame().nativeElement);
        const ink = styles.color;
        const grid = styles.borderColor;
        const colors = bars.map((bar) =>
            bar.categoryId ? categorySchemeColor(bar.categoryId, scheme) : grid,
        );
        const currency = this.currency();
        const font = `${styles.fontSize} ${styles.fontFamily}`;
        const values = bars.map((bar) => this.format(bar.expenses, 2));
        const ctx = this.canvas().nativeElement.getContext('2d');
        let labelWidth = 0;
        if (ctx) {
            ctx.font = font;
            labelWidth = Math.max(
                0,
                ...values.map((v) => ctx.measureText(v).width),
            );
        }
        return {
            type: 'bar',
            plugins: [valueLabels(values, ink, font)],
            data: {
                labels: bars.map((bar) => bar.label),
                datasets: [
                    {
                        data: bars.map((bar) => bar.expenses / 100),
                        backgroundColor: colors,
                        hoverBackgroundColor: colors,
                        borderRadius: 4,
                        borderSkipped: 'start',
                        barThickness: 20,
                    },
                ],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                layout: {
                    padding: { right: Math.ceil(labelWidth) + VALUE_GAP },
                },
                scales: {
                    x: { beginAtZero: true, display: false },
                    y: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            color: ink,
                            autoSkip: false,
                            callback: (_value, index) => {
                                const label = bars[index]?.label ?? '';
                                return label.length > MAX_LABEL
                                    ? `${label.slice(0, MAX_LABEL - 1)}…`
                                    : label;
                            },
                        },
                    },
                },
                plugins: {
                    tooltip: {
                        displayColors: false,
                        callbacks: {
                            title: (items) =>
                                bars[items[0]?.dataIndex ?? 0]?.label ?? '',
                            label: (item) =>
                                `${this.format(bars[item.dataIndex]?.expenses ?? 0, 2)} ${currency}`,
                        },
                    },
                },
            },
        };
    }
}
