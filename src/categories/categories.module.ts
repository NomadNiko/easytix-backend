// src/categories/categories.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import {
  CategorySchema,
  CategorySchemaClass,
} from './infrastructure/persistence/document/entities/category.schema';
import { CategoryRepository } from './infrastructure/persistence/category.repository';
import { CategoryDocumentRepository } from './infrastructure/persistence/document/repositories/category.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CategorySchemaClass.name, schema: CategorySchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    {
      provide: CategoryRepository,
      useClass: CategoryDocumentRepository,
    },
  ],
  exports: [CategoriesService, CategoryRepository],
})
export class CategoriesModule {}
