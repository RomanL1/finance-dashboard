import { HouseholdDto, HouseholdMemberDto } from '../model/household.dto.js';
import type {
    HouseholdMember,
    HouseholdMembership,
} from '../model/household.js';

export function toHouseholdDto({
    household,
    role,
}: HouseholdMembership): HouseholdDto {
    const dto = new HouseholdDto();
    dto.id = household.id;
    dto.name = household.name;
    dto.role = role;
    dto.onboardingComplete = household.onboardingComplete;
    dto.baseCurrency = household.baseCurrency;
    dto.timeZone = household.timeZone;
    dto.createdAt = household.createdAt.toISOString();
    return dto;
}

export function toHouseholdMemberDto(
    member: HouseholdMember,
): HouseholdMemberDto {
    const dto = new HouseholdMemberDto();
    dto.userId = member.userId;
    dto.name = member.name;
    dto.email = member.email;
    dto.role = member.role;
    dto.joinedAt = member.joinedAt.toISOString();
    return dto;
}
