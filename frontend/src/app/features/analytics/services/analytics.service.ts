import { Injectable } from '@angular/core';
import { transactionGetCategoryStats } from '../../../core/api';
import type { DateRange } from '../../stats/stats.types';
import type { CategoryStatsDto } from '../analytics.types';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    /** Expenses per category in the household currency, largest first. */
    async getCategoryStats(
        householdId: string,
        range: DateRange,
    ): Promise<CategoryStatsDto> {
        const response = await transactionGetCategoryStats({
            path: { householdId },
            query: {
                from: range.from.toISOString(),
                to: range.to.toISOString(),
            },
            throwOnError: true,
        });
        return response.data;
    }
}
