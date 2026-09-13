import type { CategoryStatsDto } from '../../core/api';

export type { CategoryStatsDto };

/** One bar: label already resolved, so the chart never sees a null category. */
export interface CategoryBar {
    /** Null for uncategorized; drives the bar color. */
    categoryId: string | null;
    label: string;
    /** Minor units of the stats currency, positive. */
    expenses: number;
}

/** Keeps the server order (largest first) and drops empty rows, which a bar chart cannot show. */
export function toCategoryBars(
    stats: CategoryStatsDto,
    uncategorizedLabel: string,
): CategoryBar[] {
    return stats.categories
        .filter((c) => c.expenses > 0)
        .map((c) => ({
            categoryId: c.categoryId,
            label: c.categoryName ?? uncategorizedLabel,
            expenses: c.expenses,
        }));
}
