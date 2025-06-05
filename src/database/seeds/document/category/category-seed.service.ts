import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CategorySchemaClass,
  CategorySchemaDocument,
} from '../../../../categories/infrastructure/persistence/document/entities/category.schema';
import {
  QueueSchemaClass,
  QueueSchemaDocument,
} from '../../../../queues/infrastructure/persistence/document/entities/queue.schema';
import { AllConfigType } from '../../../../config/config.type';

@Injectable()
export class CategorySeedService {
  constructor(
    @InjectModel(CategorySchemaClass.name)
    private categoryModel: Model<CategorySchemaDocument>,
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
    const defaultCategoryName = this.configService.getOrThrow(
      'app.defaultCategoryName',
      {
        infer: true,
      },
    );

    // Find the default queue
    const defaultQueue = await this.queueModel.findOne({
      name: defaultQueueName,
    });

    if (!defaultQueue) {
      console.error(
        `Default queue "${defaultQueueName}" not found. Please run queue seed first.`,
      );
      return;
    }

    const existingCategory = await this.categoryModel.findOne({
      name: defaultCategoryName,
      queueId: defaultQueue._id,
    });

    if (!existingCategory) {
      await this.categoryModel.create({
        name: defaultCategoryName,
        description: 'Default category for public ticket submissions',
        queueId: defaultQueue._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(
        `Default category "${defaultCategoryName}" created successfully for queue "${defaultQueueName}"`,
      );
    } else {
      console.log(
        `Default category "${defaultCategoryName}" already exists for queue "${defaultQueueName}"`,
      );
    }
  }
}
