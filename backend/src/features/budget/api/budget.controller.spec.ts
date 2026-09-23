import { describe, expect, it, vi } from 'vitest';
import type { BudgetService } from '../service/budget.service.js';
import { BudgetController } from './budget.controller.js';

function makeController() {
    const service: Pick<BudgetService, 'set' | 'copyFromPrevious'> = {
        set: vi.fn<BudgetService['set']>().mockResolvedValue({
            id: 'b-1',
            categoryId: 'cat-1',
            month: '2026-09',
            amount: 500,
        }),
        copyFromPrevious: vi
            .fn<BudgetService['copyFromPrevious']>()
            .mockResolvedValue({
                sourceMonth: null,
                budgets: [],
                skipped: false,
            }),
    };
    // The fake covers every service method these tests reach.
    return {
        controller: new BudgetController(service as BudgetService),
        service,
    };
}

describe('BudgetController', () => {
    it('takes category and month from the path, the amount from the body', async () => {
        const { controller, service } = makeController();

        await controller.setBudget('h-1', 'cat-1', '2026-09', { amount: 500 });

        expect(service.set).toHaveBeenCalledWith('h-1', {
            categoryId: 'cat-1',
            month: '2026-09',
            amount: 500,
        });
    });

    it('copies explicitly unless auto is asked for', async () => {
        const { controller, service } = makeController();

        await controller.copyPreviousBudgets('h-1', '2026-10', {});
        await controller.copyPreviousBudgets('h-1', '2026-10', { auto: true });

        expect(service.copyFromPrevious).toHaveBeenNthCalledWith(
            1,
            'h-1',
            '2026-10',
            false,
        );
        expect(service.copyFromPrevious).toHaveBeenNthCalledWith(
            2,
            'h-1',
            '2026-10',
            true,
        );
    });
});
