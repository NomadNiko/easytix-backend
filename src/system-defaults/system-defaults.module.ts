// src/system-defaults/system-defaults.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SystemDefaultsController } from './system-defaults.controller';
import { SystemDefaultsService } from './system-defaults.service';
import {
  SystemDefaultSchema,
  SystemDefaultSchemaClass,
} from './infrastructure/persistence/document/entities/system-default.schema';
import { SystemDefaultRepository } from './infrastructure/persistence/system-default.repository';
import { SystemDefaultDocumentRepository } from './infrastructure/persistence/document/repositories/system-default.repository';
import { QueuesModule } from '../queues/queues.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SystemDefaultSchemaClass.name, schema: SystemDefaultSchema },
    ]),
    QueuesModule,
    CategoriesModule,
  ],
  controllers: [SystemDefaultsController],
  providers: [
    SystemDefaultsService,
    {
      provide: SystemDefaultRepository,
      useClass: SystemDefaultDocumentRepository,
    },
  ],
  exports: [SystemDefaultsService, SystemDefaultRepository],
})
export class SystemDefaultsModule {}