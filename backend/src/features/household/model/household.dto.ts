import { ApiProperty } from '@nestjs/swagger';
import type { HouseholdRole } from './household.js';

export class HouseholdDto {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty({ example: 'CHF' }) currency!: string;
    @ApiProperty({ enum: ['owner', 'member'] }) role!: HouseholdRole;
    @ApiProperty() onboardingComplete!: boolean;
    @ApiProperty() createdAt!: string;
}
