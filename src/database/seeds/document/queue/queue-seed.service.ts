import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  QueueSchemaClass,
  QueueSchemaDocument,
} from '../../../../queues/infrastructure/persistence/document/entities/queue.schema';
import { AllConfigType } from '../../../../config/config.type';

@Injectable()
export class QueueSeedService {
  constructor(
    @InjectModel(QueueSchemaClass.name)
    private queueModel: Model<QueueSchemaDocument>,
    private configService: ConfigService<AllConfigType>,
  ) {}

  async run(): Promise<void> {
    const defaultQueueName = this.configService.getOrThrow(
      'app.defaultQueueName',
      {
        infer: true,
      },
    );

    const existingQueue = await this.queueModel.findOne({
      name: defaultQueueName,
    });

    if (!existingQueue) {
      await this.queueModel.create({
        name: defaultQueueName,
        description: 'Default queue for public ticket submissions',
        assignedUsers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`Default queue "${defaultQueueName}" created successfully`);
    } else {
      console.log(`Default queue "${defaultQueueName}" already exists`);
    }
  }
}
