import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsIn,
    IsInt,
    IsISO8601,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    IsString,
    MaxLength,
} from 'class-validator';
import { TRANSACTION_TYPES } from './transaction.schema.js';

export class TransactionDto {
    @ApiProperty() id!: string;
    @ApiProperty() accountId!: string;
    @ApiProperty() categoryId!: string;
    @ApiProperty({ enum: TRANSACTION_TYPES }) type!: string;
    @ApiProperty({
        description: 'Minor units (cents), positive; sign comes from type',
    })
    amount!: number;
    @ApiProperty() title!: string;
    @ApiProperty({ nullable: true, type: String }) description!: string | null;
    @ApiProperty() date!: string;
    @ApiProperty() createdAt!: string;
}

const trim = Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
);

export class CreateTransactionDto {
    @ApiProperty({ description: 'Account id within the household' })
    @IsString()
    @IsNotEmpty()
    accountId!: string;

    @ApiProperty({ description: 'Category id within the household' })
    @IsString()
    @IsNotEmpty()
    categoryId!: string;

    @ApiProperty({ enum: TRANSACTION_TYPES, example: 'expense' })
    @IsIn(TRANSACTION_TYPES)
    type!: (typeof TRANSACTION_TYPES)[number];

    @ApiProperty({ description: 'Minor units (cents)', example: 1250 })
    @IsInt()
    @IsPositive()
    amount!: number;

    @ApiProperty({ example: 'Groceries' })
    @trim
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    title!: string;

    @ApiProperty({ required: false, nullable: true, type: String })
    @IsOptional()
    @trim
    @IsString()
    @MaxLength(1000)
    description?: string | null;

    @ApiProperty({ example: '2026-01-15' })
    @IsISO8601()
    date!: string;
}
