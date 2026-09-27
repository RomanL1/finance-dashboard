import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    IsString,
    Matches,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { MAX_AMOUNT } from '../../../shared/kernel/index.js';
import { TRANSACTION_TYPES } from '../../transaction/model/transaction-type.js';
import { RECURRENCE_INTERVALS } from './recurring.schema.js';

export class RecurringTransactionDto {
    @ApiProperty() id!: string;
    @ApiProperty() accountId!: string;
    @ApiProperty({ nullable: true, type: String }) categoryId!: string | null;
    @ApiProperty({ enum: TRANSACTION_TYPES }) type!: string;
    @ApiProperty({
        description:
            'Minor units (cents), positive; for a varying amount the expected value',
    })
    amount!: number;
    @ApiProperty({ nullable: true, type: String }) title!: string | null;
    @ApiProperty({ nullable: true, type: String }) description!: string | null;
    @ApiProperty({ enum: RECURRENCE_INTERVALS }) interval!: string;
    @ApiProperty({
        nullable: true,
        type: Number,
        description: 'Weekly only: ISO weekday, 1 = Monday … 7 = Sunday',
    })
    weekday!: number | null;
    @ApiProperty({
        nullable: true,
        type: Number,
        description:
            'Monthly and longer only: 1–31, falls on the last day in shorter months',
    })
    dayOfMonth!: number | null;
    @ApiProperty({ example: '2026-01-31' }) startDate!: string;
    @ApiProperty({
        description: 'Booked transactions wait for confirmation',
    })
    varyingAmount!: boolean;
    @ApiProperty({
        description:
            'Monthly and longer only: Saturday/Sunday occurrences book on the Friday before',
    })
    weekendShift!: boolean;
    @ApiProperty() paused!: boolean;
    @ApiProperty({
        example: '2026-02-27',
        description:
            'Booking day (after the weekend shift, household time zone) of the next occurrence after today, whether already booked with its month or not',
    })
    nextDate!: string;
    @ApiProperty() createdAt!: string;
}

const trim = Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
);

export class SaveRecurringTransactionDto {
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

    @ApiProperty({
        description: 'Minor units (cents)',
        example: 180000,
        maximum: MAX_AMOUNT,
    })
    @IsInt()
    @IsPositive()
    @Max(MAX_AMOUNT)
    amount!: number;

    @ApiProperty({
        example: 'Rent',
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

    @ApiProperty({ enum: RECURRENCE_INTERVALS, example: 'monthly' })
    @IsIn(RECURRENCE_INTERVALS)
    interval!: (typeof RECURRENCE_INTERVALS)[number];

    @ApiProperty({
        required: false,
        nullable: true,
        type: Number,
        minimum: 1,
        maximum: 7,
        description:
            "Weekly only: ISO weekday; defaults to the start date's. Ignored otherwise",
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(7)
    weekday?: number | null;

    @ApiProperty({
        required: false,
        nullable: true,
        type: Number,
        minimum: 1,
        maximum: 31,
        description:
            "Monthly and longer only; defaults to the start date's day. Ignored otherwise",
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(31)
    dayOfMonth?: number | null;

    @ApiProperty({
        example: '2026-01-31',
        description:
            'First possible occurrence, at most one year back; past occurrences are booked right away',
    })
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be YYYY-MM-DD' })
    startDate!: string;

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @IsBoolean()
    varyingAmount?: boolean;

    @ApiProperty({
        required: false,
        default: false,
        description: 'Monthly and longer only; ignored otherwise',
    })
    @IsOptional()
    @IsBoolean()
    weekendShift?: boolean;
}
