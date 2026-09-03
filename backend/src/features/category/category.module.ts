import { forwardRef, Module } from '@nestjs/common';
import { HouseholdModule } from '../household/household.module.js';
import { CategoryController } from './api/category.controller.js';
import { CategoryDefaultsController } from './api/category-defaults.controller.js';
import { CategoryRepository } from './repository/category.repository.js';
import { CategoryService } from './service/category.service.js';

@Module({
    imports: [forwardRef(() => HouseholdModule)],
    controllers: [CategoryController, CategoryDefaultsController],
    providers: [CategoryService, CategoryRepository],
    exports: [CategoryService],
})
export class CategoryModule {}
