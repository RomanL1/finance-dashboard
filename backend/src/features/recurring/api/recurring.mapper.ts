import { RecurringTransactionDto } from '../model/recurring.dto.js';
import type { RecurringTransactionView } from '../model/recurring.js';

export function toRecurringTransactionDto(
    rule: RecurringTransactionView,
): RecurringTransactionDto {
    const dto = new RecurringTransactionDto();
    dto.id = rule.id;
    dto.accountId = rule.accountId;
    dto.categoryId = rule.categoryId;
    dto.type = rule.type;
    dto.amount = rule.amount;
    dto.title = rule.title;
    dto.description = rule.description;
    dto.interval = rule.interval;
    dto.weekday = rule.weekday;
    dto.dayOfMonth = rule.dayOfMonth;
    dto.startDate = rule.startDate;
    dto.varyingAmount = rule.varyingAmount;
    dto.weekendShift = rule.weekendShift;
    dto.paused = rule.paused;
    dto.nextDate = rule.nextDate;
    dto.createdAt = rule.createdAt.toISOString();
    return dto;
}
