import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsISO8601,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../../shared/kernel/index.js';

export class AccountDto {
    @ApiProperty() id!: string;
    @ApiProperty() householdId!: string;
    @ApiProperty() description!: string;
    @ApiProperty({ example: 'CHF' }) currency!: string;
    @ApiProperty({ description: 'Minor units (cents)' }) initialValue!: number;
    @ApiProperty({ description: 'Minor units (cents)' }) amount!: number;
    @ApiProperty() startDate!: string;
    @ApiProperty() createdAt!: string;
}

export class CreateAccountDto {
    @ApiProperty({ description: 'Account description', example: 'Checking' })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    description!: string;

    @ApiProperty({
        enum: SUPPORTED_CURRENCIES,
        example: 'CHF',
        required: false,
        description: 'Defaults to the household currency when omitted',
    })
    @IsOptional()
    @IsIn(SUPPORTED_CURRENCIES)
    currency?: string;

    @ApiProperty({ description: 'Minor units (cents)', example: 100000 })
    @IsInt()
    initialValue!: number;

    @ApiProperty({ example: '2026-01-01' })
    @IsISO8601()
    startDate!: string;
}
