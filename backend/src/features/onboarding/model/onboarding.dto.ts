import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsIn,
    IsInt,
    IsISO8601,
    IsNotEmpty,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../shared/kernel/index.js';

export class OnboardingHouseholdDto {
    @ApiProperty({ description: 'Household name', example: 'Home' })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;
}

export class OnboardingAccountDto {
    @ApiProperty({ description: 'Account description', example: 'Checking' })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    description!: string;

    @ApiProperty({ enum: SUPPORTED_CURRENCIES, example: 'CHF' })
    @IsIn(SUPPORTED_CURRENCIES)
    currency!: string;

    @ApiProperty({ description: 'Minor units (cents)', example: 100000 })
    @IsInt()
    initialValue!: number;

    @ApiProperty({ example: '2026-01-01' })
    @IsISO8601()
    startDate!: string;
}

export class OnboardingCategoriesDto {
    @ApiProperty({ type: [String], example: ['Groceries', 'Housing'] })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(100, { each: true })
    categoryNames!: string[];
}

export class OnboardingAccountsDto {
    @ApiProperty({ type: [OnboardingAccountDto] })
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => OnboardingAccountDto)
    accounts!: OnboardingAccountDto[];
}

export class CompleteOnboardingDto extends OnboardingHouseholdDto {
    @ApiProperty({ type: [String], example: ['Groceries', 'Housing'] })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(100, { each: true })
    categoryNames!: string[];

    @ApiProperty({ type: [OnboardingAccountDto] })
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => OnboardingAccountDto)
    accounts!: OnboardingAccountDto[];
}
