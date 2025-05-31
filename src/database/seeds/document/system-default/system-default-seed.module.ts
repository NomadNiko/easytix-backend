import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SystemDefaultSeedService } from './system-default-seed.service';
import {
  SystemDefaultSchema,
  SystemDefaultSchemaClass,
} from '../../../../system-defaults/infrastructure/persistence/document/entities/system-default.schema';
import {
  QueueSchema,
  QueueSchemaClass,
} from '../../../../queues/infrastructure/persistence/document/entities/queue.schema';
import {
  CategorySchema,
  CategorySchemaClass,
} from '../../../../categories/infrastructure/persistence/document/entities/category.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: SystemDefaultSchemaClass.name, schema: SystemDefaultSchema },
      { name: QueueSchemaClass.name, schema: QueueSchema },
      { name: CategorySchemaClass.name, schema: CategorySchema },
    ]),
  ],
  providers: [SystemDefaultSeedService],
  exports: [SystemDefaultSeedService],
})
export class SystemDefaultSeedModule {}