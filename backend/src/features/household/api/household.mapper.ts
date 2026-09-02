import { HouseholdDto } from '../model/household.dto.js';
import type { HouseholdMembership } from '../model/household.js';

export function toHouseholdDto({
    household,
    role,
}: HouseholdMembership): HouseholdDto {
    const dto = new HouseholdDto();
    dto.id = household.id;
    dto.name = household.name;
    dto.currency = household.currency;
    dto.role = role;
    dto.createdAt = household.createdAt.toISOString();
    return dto;
}
