import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CategoryDto {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty() createdAt!: string;
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