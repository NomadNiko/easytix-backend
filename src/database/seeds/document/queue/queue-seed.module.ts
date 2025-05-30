import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QueueSeedService } from './queue-seed.service';
import {
  QueueSchema,
  QueueSchemaClass,
} from '../../../../queues/infrastructure/persistence/document/entities/queue.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QueueSchemaClass.name, schema: QueueSchema },
    ]),
  ],
  providers: [QueueSeedService],
  exports: [QueueSeedService],
})
export class QueueSeedModule {}
