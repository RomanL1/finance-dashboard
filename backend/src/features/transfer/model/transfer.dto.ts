import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsInt,
    IsISO8601,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { MAX_AMOUNT } from '../../../shared/kernel/index.js';
import { MAX_PAGE_SIZE, PAGE_SIZE } from './transfer.js';

export class TransferDto {
    @ApiProperty() id!: string;
    @ApiProperty({ description: 'Paying account' }) fromAccountId!: string;
    @ApiProperty({ description: 'Receiving account' }) toAccountId!: string;
    @ApiProperty({ description: 'Minor units (cents), positive' })
    amount!: number;
    @ApiProperty({ nullable: true, type: String }) title!: string | null;
    @ApiProperty({ example: '2026-01-15T12:30:00.000Z' }) date!: string;
    @ApiProperty() createdAt!: string;
}

export class TransferPageDto {
    @ApiProperty({ type: [TransferDto] }) items!: TransferDto[];
    @ApiProperty({ description: 'Matching rows across all pages' })
    total!: number;
    @ApiProperty({ description: '1-based' }) page!: number;
    @ApiProperty() pageSize!: number;
}

export class TransferListQueryDto {
    @ApiProperty({
        required: false,
        description: 'Only transfers from or to this account',
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    accountId?: string;

    @ApiProperty({ required: false, default: 1, description: '1-based' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiProperty({
        required: false,
        default: PAGE_SIZE,
        maximum: MAX_PAGE_SIZE,
        description: 'Rows per page',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(MAX_PAGE_SIZE)
    pageSize?: number;
}

const trim = Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
);

export class CreateTransferDto {
    @ApiProperty({ description: 'Paying account within the household' })
    @IsString()
    @IsNotEmpty()
    fromAccountId!: string;

    @ApiProperty({
        description: 'Receiving account within the household, not the payer',
    })
    @IsString()
    @IsNotEmpty()
    toAccountId!: string;

    @ApiProperty({
        description: 'Minor units (cents)',
        example: 50000,
        maximum: MAX_AMOUNT,
    })
    @IsInt()
    @IsPositive()
    @Max(MAX_AMOUNT)
    amount!: number;

    @ApiProperty({
        example: 'Credit card bill',
        required: false,
        nullable: true,
        type: String,
    })
    @IsOptional()
    @trim
    @IsString()
    @MaxLength(100)
    title?: string | null;

    @ApiProperty({ example: '2026-01-15T12:30:00.000Z' })
    @IsISO8601()
    date!: string;
}
