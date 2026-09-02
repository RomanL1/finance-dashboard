import { CategoryDto } from '../model/category.dto.js';
import { Category } from '../model/category.js';

export function toCategoryDto({ id, name, createdAt }: Category): CategoryDto {
    const dto = new CategoryDto();
    dto.id = id;
    dto.name = name;
    dto.createdAt = createdAt.toISOString();
    return dto;
}

export function toCategoriesDto(categories: Category[]): CategoryDto[] {
    return categories.map(toCategoryDto);
}
