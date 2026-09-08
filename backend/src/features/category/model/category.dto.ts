import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CategoryDto {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty() createdAt!: string;
    @ApiProperty({ description: 'Transactions assigned to this category' })
    transactionCount!: number;
}

export class DeleteCategoryQueryDto {
    @ApiPropertyOptional({
        description:
            'Reassign the transactions to this category before deleting. Omitted: they become uncategorized.',
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    transferTo?: string;
}

export class CreateCategoryDto {
    @ApiProperty({ description: 'Category name', example: 'Groceries' })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;
}

export class DefaultCategoryDto {
    @ApiProperty({
        description: 'category translation key',
        example: 'GROCERIES',
    })
    translateKey!: string;
}
