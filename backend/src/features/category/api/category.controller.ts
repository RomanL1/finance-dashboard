import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiCookieAuth,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiTags,
} from '@nestjs/swagger';
import { CategoryService } from '../service/category.service.js';
import { CategoryDto, CreateCategoryDto } from '../model/category.dto.js';
import { toCategoriesDto, toCategoryDto } from './category.mapper.js';
import { type Id } from '../../../shared/kernel/index.js';
import { HouseholdMemberGuard } from '../../household/guard/household-member.guard.js';

@ApiTags('category')
@ApiCookieAuth()
@UseGuards(HouseholdMemberGuard)
@Controller('households/:householdId/categories')
export class CategoryController {
    constructor(private readonly categories: CategoryService) {}

    @Get()
    @ApiOkResponse({ type: [CategoryDto] })
    async getCategories(
        @Param('householdId') householdId: Id,
    ): Promise<CategoryDto[]> {
        return toCategoriesDto(await this.categories.getAll(householdId));
    }

    @Post()
    @ApiOkResponse({ type: CategoryDto })
    async createCategory(
        @Param('householdId') householdId: Id,
        @Body() dto: CreateCategoryDto,
    ): Promise<CategoryDto> {
        return toCategoryDto(
            await this.categories.create(dto.name, householdId),
        );
    }

    @Patch(':categoryId')
    @ApiOkResponse({ type: CategoryDto })
    async updateCategory(
        @Param('householdId') householdId: Id,
        @Param('categoryId') categoryId: Id,
        @Body() dto: CreateCategoryDto,
    ): Promise<CategoryDto> {
        return toCategoryDto(
            await this.categories.rename(householdId, categoryId, dto.name),
        );
    }

    @Delete(':categoryId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Category successfully deleted' })
    async deleteCategory(
        @Param('householdId') householdId: Id,
        @Param('categoryId') categoryId: Id,
    ): Promise<void> {
        await this.categories.delete(householdId, categoryId);
    }
}
