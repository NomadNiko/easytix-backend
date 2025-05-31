import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SystemDefaultSchemaClass,
  SystemDefaultSchemaDocument,
} from '../../../../system-defaults/infrastructure/persistence/document/entities/system-default.schema';
import {
  QueueSchemaClass,
  QueueSchemaDocument,
} from '../../../../queues/infrastructure/persistence/document/entities/queue.schema';
import {
  CategorySchemaClass,
  CategorySchemaDocument,
} from '../../../../categories/infrastructure/persistence/document/entities/category.schema';
import { AllConfigType } from '../../../../config/config.type';
import { SystemDefaultKey } from '../../../../system-defaults/domain/system-default';

@Injectable()
export class SystemDefaultSeedService {
  constructor(
    @InjectModel(SystemDefaultSchemaClass.name)
    private systemDefaultModel: Model<SystemDefaultSchemaDocument>,
    @InjectModel(QueueSchemaClass.name)
    private queueModel: Model<QueueSchemaDocument>,
    @InjectModel(CategorySchemaClass.name)
    private categoryModel: Model<CategorySchemaDocument>,
    private configService: ConfigService<AllConfigType>,
  ) {}

  async run(): Promise<void> {
    console.log('Setting up system defaults...');

    // Get the default queue name from config
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

    // Find the default queue by name
    const defaultQueue = await this.queueModel.findOne({
      name: defaultQueueName,
    });

    if (!defaultQueue) {
      console.error(`Default queue "${defaultQueueName}" not found. Make sure queue seeds run first.`);
      return;
    }

    // Find the default category by name and queue
    const defaultCategory = await this.categoryModel.findOne({
      name: defaultCategoryName,
      queueId: defaultQueue._id.toString(),
    });

    if (!defaultCategory) {
      console.error(`Default category "${defaultCategoryName}" not found. Make sure category seeds run first.`);
      return;
    }

    // Set up default queue system setting
    const existingDefaultQueue = await this.systemDefaultModel.findOne({
      key: SystemDefaultKey.DEFAULT_QUEUE_ID,
    });

    if (!existingDefaultQueue) {
      await this.systemDefaultModel.create({
        key: SystemDefaultKey.DEFAULT_QUEUE_ID,
        value: defaultQueue._id.toString(),
        description: 'Default queue for public ticket submissions',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`System default for DEFAULT_QUEUE_ID set to: ${defaultQueue._id.toString()}`);
    } else {
      // Update existing default queue if it's different
      if (existingDefaultQueue.value !== defaultQueue._id.toString()) {
        existingDefaultQueue.value = defaultQueue._id.toString();
        existingDefaultQueue.updatedAt = new Date();
        await existingDefaultQueue.save();
        console.log(`System default for DEFAULT_QUEUE_ID updated to: ${defaultQueue._id.toString()}`);
      } else {
        console.log(`System default for DEFAULT_QUEUE_ID already set correctly`);
      }
    }

    // Set up default category system setting
    const existingDefaultCategory = await this.systemDefaultModel.findOne({
      key: SystemDefaultKey.DEFAULT_CATEGORY_ID,
    });

    if (!existingDefaultCategory) {
      await this.systemDefaultModel.create({
        key: SystemDefaultKey.DEFAULT_CATEGORY_ID,
        value: defaultCategory._id.toString(),
        description: 'Default category for public ticket submissions',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`System default for DEFAULT_CATEGORY_ID set to: ${defaultCategory._id.toString()}`);
    } else {
      // Update existing default category if it's different
      if (existingDefaultCategory.value !== defaultCategory._id.toString()) {
        existingDefaultCategory.value = defaultCategory._id.toString();
        existingDefaultCategory.updatedAt = new Date();
        await existingDefaultCategory.save();
        console.log(`System default for DEFAULT_CATEGORY_ID updated to: ${defaultCategory._id.toString()}`);
      } else {
        console.log(`System default for DEFAULT_CATEGORY_ID already set correctly`);
      }
    }

    console.log('System defaults setup completed');
  }
}