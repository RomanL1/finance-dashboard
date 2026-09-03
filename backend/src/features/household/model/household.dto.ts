import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../shared/kernel/index.js';
import type { HouseholdRole } from './household.js';

export class HouseholdDto {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty({ example: 'CHF' }) currency!: string;
    @ApiProperty({ enum: ['owner', 'member'] }) role!: HouseholdRole;
    @ApiProperty() onboardingComplete!: boolean;
    @ApiProperty() createdAt!: string;
}

export class CreateHouseholdDto {
    @ApiProperty({ description: 'Household name', example: 'Home' })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @ApiProperty({ enum: SUPPORTED_CURRENCIES, example: 'CHF' })
    @IsIn(SUPPORTED_CURRENCIES)
    currency!: string;
}
