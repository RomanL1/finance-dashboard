import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsOptional,
    Matches,
    Max,
    Min,
} from 'class-validator';
import { MAX_AMOUNT } from '../../../shared/kernel/index.js';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export class BudgetDto {
    @ApiProperty() id!: string;
    @ApiProperty() categoryId!: string;
    @ApiProperty({
        description: 'Calendar month as YYYY-MM',
        example: '2026-09',
    })
    month!: string;
    @ApiProperty({
        description:
            'Limit in minor units of the household currency. 0 is a deliberate zero limit.',
        example: 50000,
    })
    amount!: number;
}

export class BudgetListQueryDto {
    @ApiProperty({
        description: 'Calendar month as YYYY-MM',
        example: '2026-09',
    })
    @Matches(MONTH_PATTERN, { message: 'month must be formatted as YYYY-MM' })
    month!: string;
}

export class SetBudgetDto {
    @ApiProperty({
        description:
            'Limit in minor units of the household currency, 0 or more',
        example: 50000,
        maximum: MAX_AMOUNT,
    })
    @IsInt()
    @Min(0)
    @Max(MAX_AMOUNT)
    amount!: number;
}

export class CopyPreviousQueryDto {
    @ApiProperty({
        description:
            'Take-over on first view: does nothing when the limits of the month were set, removed or taken over before',
        required: false,
        default: false,
    })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        value === 'true' ? true : value === 'false' ? false : value,
    )
    @IsBoolean()
    auto?: boolean;
}

export class CopiedBudgetsDto {
    @ApiProperty({
        description:
            'Month the limits were taken from, or null when no earlier month had any',
        example: '2026-08',
        type: String,
        nullable: true,
    })
    sourceMonth!: string | null;
    @ApiProperty({ type: [BudgetDto] })
    budgets!: BudgetDto[];
    @ApiProperty({
        description:
            'True when an automatic take-over left the month alone because its limits were touched before',
    })
    skipped!: boolean;
}
