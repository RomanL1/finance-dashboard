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
    @ApiProperty({ nullable: true, type: String }) categoryId!: string | null;
    @ApiProperty({ enum: TRANSACTION_TYPES }) type!: string;
    @ApiProperty({
        description: 'Minor units (cents), positive; sign comes from type',
    })
    amount!: number;
    @ApiProperty({ nullable: true, type: String }) title!: string | null;
    @ApiProperty({ nullable: true, type: String }) description!: string | null;
    @ApiProperty({ example: '2026-01-15T12:30:00.000Z' }) date!: string;
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

    @ApiProperty({
        description: 'Category id within the household',
        required: false,
        nullable: true,
        type: String,
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    categoryId?: string | null;

    @ApiProperty({ enum: TRANSACTION_TYPES, example: 'expense' })
    @IsIn(TRANSACTION_TYPES)
    type!: (typeof TRANSACTION_TYPES)[number];

    @ApiProperty({ description: 'Minor units (cents)', example: 1250 })
    @IsInt()
    @IsPositive()
    amount!: number;

    @ApiProperty({
        example: 'Groceries',
        required: false,
        nullable: true,
        type: String,
    })
    @IsOptional()
    @trim
    @IsString()
    @MaxLength(100)
    title?: string | null;

    @ApiProperty({ required: false, nullable: true, type: String })
    @IsOptional()
    @trim
    @IsString()
    @MaxLength(1000)
    description?: string | null;

    @ApiProperty({ example: '2026-01-15T12:30:00.000Z' })
    @IsISO8601()
    date!: string;
}

export class StatsQueryDto {
    @ApiProperty({
        description: 'Range start (inclusive)',
        example: '2026-09-01T00:00:00.000Z',
    })
    @IsISO8601()
    from!: string;

    @ApiProperty({
        description: 'Range end (exclusive)',
        example: '2026-10-01T00:00:00.000Z',
    })
    @IsISO8601()
    to!: string;
}

/** Sums over the range, every amount converted into the household base currency at its day's rate. */
export class CurrencyStatsDto {
    @ApiProperty({ example: 'CHF', description: 'Household base currency' })
    currency!: string;
    @ApiProperty({ description: 'Minor units (cents)' }) income!: number;
    @ApiProperty({ description: 'Minor units (cents)' }) expenses!: number;
    @ApiProperty({ description: 'Minor units (cents), income - expenses' })
    net!: number;
}

export class CategoryExpenseDto {
    @ApiProperty({ nullable: true, type: String }) categoryId!: string | null;
    @ApiProperty({
        nullable: true,
        type: String,
        description: 'Null for uncategorized entries',
    })
    categoryName!: string | null;
    @ApiProperty({ description: 'Minor units (cents) of `currency`' })
    expenses!: number;
}

/** Expenses per category, every amount converted into the household base currency at its day's rate. */
export class CategoryStatsDto {
    @ApiProperty({ example: 'CHF', description: 'Household base currency' })
    currency!: string;
    @ApiProperty({
        type: [CategoryExpenseDto],
        description: 'Sorted by expenses, descending',
    })
    categories!: CategoryExpenseDto[];
}
