// src/queues/queues.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';
import {
  QueueSchema,
  QueueSchemaClass,
} from './infrastructure/persistence/document/entities/queue.schema';
import { QueueRepository } from './infrastructure/persistence/queue.repository';
import { QueueDocumentRepository } from './infrastructure/persistence/document/repositories/queue.repository';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QueueSchemaClass.name, schema: QueueSchema },
    ]),
    MailModule,
    UsersModule,
  ],
  controllers: [QueuesController],
  providers: [
    QueuesService,
    {
      provide: QueueRepository,
      useClass: QueueDocumentRepository,
    },
  ],
  exports: [QueuesService, QueueRepository],
})
export class QueuesModule {}
