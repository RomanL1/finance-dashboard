import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CategoryService } from '../service/category.service.js';
import { DefaultCategoryDto } from '../model/category.dto.js';
import { DefaultCategory } from '../model/category.js';

/**
 * Not household-scoped: the default category list is a fixed set of translation keys,
 * needed before a household exists (e.g. during onboarding).
 */
@ApiTags('category')
@ApiCookieAuth()
@Controller('categories')
export class CategoryDefaultsController {
    constructor(private readonly categories: CategoryService) {}

    @Get('default')
    @ApiOkResponse({ type: [DefaultCategoryDto] })
    async getDefaultCategories(): Promise<DefaultCategory[]> {
        return this.categories.getDefaultCategories();
    }
}
