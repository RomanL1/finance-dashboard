import { describe, expect, it } from 'vitest';
import type { Budget } from '../model/budget.js';
import { BudgetDto, CopiedBudgetsDto } from '../model/budget.dto.js';
import {
    toBudgetDto,
    toBudgetsDto,
    toCopiedBudgetsDto,
} from './budget.mapper.js';

const budget: Budget = {
    id: 'b-1',
    categoryId: 'cat-1',
    month: '2026-09',
    amount: 0,
};

describe('budget mappers', () => {
    it('copies every field of a limit', () => {
        const dto = toBudgetDto(budget);
        expect(dto).toBeInstanceOf(BudgetDto);
        expect({ ...dto }).toEqual(budget);
    });

    it('maps lists in order', () => {
        expect(
            toBudgetsDto([budget, { ...budget, id: 'b-2' }]).map((b) => b.id),
        ).toEqual(['b-1', 'b-2']);
    });

    it('maps a copy outcome, including an empty one', () => {
        const copied = toCopiedBudgetsDto({
            sourceMonth: '2026-08',
            budgets: [budget],
            skipped: false,
        });
        expect(copied).toBeInstanceOf(CopiedBudgetsDto);
        expect(copied.sourceMonth).toBe('2026-08');
        expect(copied.budgets[0]).toBeInstanceOf(BudgetDto);
        expect(copied.skipped).toBe(false);

        expect({
            ...toCopiedBudgetsDto({
                sourceMonth: null,
                budgets: [],
                skipped: true,
            }),
        }).toEqual({ sourceMonth: null, budgets: [], skipped: true });
    });
});
