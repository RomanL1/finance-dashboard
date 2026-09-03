import { AccountDto } from '../model/account.dto.js';
import { Account } from '../model/account.js';

export function toAccountDto({
    id,
    householdId,
    description,
    currency,
    initialValue,
    amount,
    startDate,
    createdAt,
}: Account): AccountDto {
    const dto = new AccountDto();
    dto.id = id;
    dto.householdId = householdId;
    dto.description = description;
    dto.currency = currency;
    dto.initialValue = initialValue;
    dto.amount = amount;
    dto.startDate = startDate.toISOString();
    dto.createdAt = createdAt.toISOString();
    return dto;
}

export function toAccountsDto(accounts: Account[]): AccountDto[] {
    return accounts.map(toAccountDto);
}
