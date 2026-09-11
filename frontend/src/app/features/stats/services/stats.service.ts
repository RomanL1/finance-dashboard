import { Injectable } from '@angular/core';
import { transactionGetStats } from '../../../core/api';
import type { CurrencyStatsDto, DateRange } from '../stats.types';

@Injectable({ providedIn: 'root' })
export class StatsService {
    async get(
        householdId: string,
        range: DateRange,
    ): Promise<CurrencyStatsDto[]> {
        const response = await transactionGetStats({
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
