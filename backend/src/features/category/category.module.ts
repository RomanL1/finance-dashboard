import { Module } from '@nestjs/common';
import { HouseholdModule } from '../household/household.module.js';
import { CategoryController } from './api/category.controller.js';
import { CategoryRepository } from './repository/category.repository.js';
import { CategoryService } from './service/category.service.js';

@Module({
    imports: [HouseholdModule],
    controllers: [CategoryController],
    providers: [CategoryService, CategoryRepository],
    exports: [CategoryService],
})
export class CategoryModule {}
