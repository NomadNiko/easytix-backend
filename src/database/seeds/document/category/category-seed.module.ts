import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategorySeedService } from './category-seed.service';
import {
  CategorySchema,
  CategorySchemaClass,
} from '../../../../categories/infrastructure/persistence/document/entities/category.schema';
import {
  QueueSchema,
  QueueSchemaClass,
} from '../../../../queues/infrastructure/persistence/document/entities/queue.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CategorySchemaClass.name, schema: CategorySchema },
      { name: QueueSchemaClass.name, schema: QueueSchema },
    ]),
  ],
  providers: [CategorySeedService],
  exports: [CategorySeedService],
})
export class CategorySeedModule {}
