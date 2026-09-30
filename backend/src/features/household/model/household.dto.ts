import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsTimeZone,
    MaxLength,
} from 'class-validator';
import {
    SUPPORTED_CURRENCIES,
    type SupportedCurrency,
} from '../../../shared/kernel/index.js';
import type { HouseholdRole } from './household.js';

export class HouseholdDto {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty({ enum: ['owner', 'member'] }) role!: HouseholdRole;
    @ApiProperty() onboardingComplete!: boolean;
    @ApiProperty({
        enum: SUPPORTED_CURRENCIES,
        description:
            'Currency of every account and transaction; changing it relabels them without converting amounts',
    })
    baseCurrency!: SupportedCurrency;
    @ApiProperty({
        example: 'Europe/Zurich',
        description:
            'IANA time zone; recurring transactions book at local midnight here',
    })
    timeZone!: string;
    @ApiProperty() createdAt!: string;
}

export class HouseholdMemberDto {
    @ApiProperty() userId!: string;
    @ApiProperty() name!: string;
    @ApiProperty() email!: string;
    @ApiProperty({ enum: ['owner', 'member'] }) role!: HouseholdRole;
    @ApiProperty() joinedAt!: string;
}

/** Partial update; owners only. */
export class UpdateHouseholdDto {
    @ApiProperty({ required: false, example: 'Home' })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name?: string;

    @ApiProperty({
        required: false,
        enum: SUPPORTED_CURRENCIES,
        example: 'CHF',
    })
    @IsOptional()
    @IsIn(SUPPORTED_CURRENCIES)
    baseCurrency?: SupportedCurrency;

    @ApiProperty({
        required: false,
        example: 'Europe/Zurich',
        description: 'IANA time zone; affects only later occurrences',
    })
    @IsOptional()
    @IsTimeZone()
    timeZone?: string;
}
