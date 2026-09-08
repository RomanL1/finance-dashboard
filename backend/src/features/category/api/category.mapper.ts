import { CategoryDto } from '../model/category.dto.js';
import { Category } from '../model/category.js';

export function toCategoryDto({
    id,
    name,
    createdAt,
    transactionCount,
}: Category): CategoryDto {
    const dto = new CategoryDto();
    dto.id = id;
    dto.name = name;
    dto.createdAt = createdAt.toISOString();
    dto.transactionCount = transactionCount;
    return dto;
}

export function toCategoriesDto(categories: Category[]): CategoryDto[] {
    return categories.map(toCategoryDto);
}
