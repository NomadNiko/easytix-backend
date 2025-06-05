import { NestFactory } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { MongooseConfigService } from '../mongoose-config.service';
import databaseConfig from '../config/database.config';
import appConfig from '../../config/app.config';
import {
  QueueSchema,
  QueueSchemaClass,
} from '../../queues/infrastructure/persistence/document/entities/queue.schema';
import {
  CategorySchema,
  CategorySchemaClass,
} from '../../categories/infrastructure/persistence/document/entities/category.schema';
import { IdGeneratorService } from '../../utils/id-generator.service';

@Injectable()
class MigrationService {
  constructor(
    @InjectModel(QueueSchemaClass.name)
    private queueModel: Model<QueueSchemaClass>,
    @InjectModel(CategorySchemaClass.name)
    private categoryModel: Model<CategorySchemaClass>,
    private idGeneratorService: IdGeneratorService,
  ) {}

  async migrateQueues() {
    console.log('Starting queue migration...');

    // Get all queues without customId
    const queues = await this.queueModel
      .find({
        $or: [{ customId: { $exists: false } }, { customId: null }],
      })
      .sort({ createdAt: 1 });

    console.log(`Found ${queues.length} queues to migrate`);

    let sequence = 1;
    for (const queue of queues) {
      const customId = this.idGeneratorService.generateQueueId(sequence);
      await this.queueModel.updateOne(
        { _id: queue._id },
        { $set: { customId } },
      );
      console.log(`Updated queue "${queue.name}" with customId: ${customId}`);
      sequence++;
    }

    console.log('Queue migration completed');
  }

  async migrateCategories() {
    console.log('Starting category migration...');

    // Get all categories without customId
    const categories = await this.categoryModel
      .find({
        $or: [{ customId: { $exists: false } }, { customId: null }],
      })
      .sort({ createdAt: 1 });

    console.log(`Found ${categories.length} categories to migrate`);

    let sequence = 1;
    for (const category of categories) {
      const customId = this.idGeneratorService.generateCategoryId(sequence);
      await this.categoryModel.updateOne(
        { _id: category._id },
        { $set: { customId } },
      );
      console.log(
        `Updated category "${category.name}" with customId: ${customId}`,
      );
      sequence++;
    }

    console.log('Category migration completed');
  }

  async updateSystemDefaults() {
    console.log('Updating system defaults to use customIds...');

    // Import SystemDefault schema here to avoid circular dependency
    const { SystemDefaultSchema, SystemDefaultSchemaClass } = await import(
      '../../system-defaults/infrastructure/persistence/document/entities/system-default.schema'
    );

    // Check if model already exists, otherwise create it
    let systemDefaultModel;
    try {
      systemDefaultModel = this.queueModel.db.model(
        SystemDefaultSchemaClass.name,
      );
    } catch {
      systemDefaultModel = this.queueModel.db.model(
        SystemDefaultSchemaClass.name,
        SystemDefaultSchema,
      );
    }

    // Get current defaults
    const queueDefault = await systemDefaultModel.findOne({
      key: 'DEFAULT_QUEUE_ID',
    });

    const categoryDefault = await systemDefaultModel.findOne({
      key: 'DEFAULT_CATEGORY_ID',
    });

    // Update queue default to use customId
    if (queueDefault) {
      const queue = await this.queueModel.findById(queueDefault.value);
      if (queue && queue.customId) {
        await systemDefaultModel.updateOne(
          { _id: queueDefault._id },
          { $set: { value: queue.customId } },
        );
        console.log(
          `Updated DEFAULT_QUEUE_ID to use customId: ${queue.customId}`,
        );
      }
    }

    // Update category default to use customId
    if (categoryDefault) {
      const category = await this.categoryModel.findById(categoryDefault.value);
      if (category && category.customId) {
        await systemDefaultModel.updateOne(
          { _id: categoryDefault._id },
          { $set: { value: category.customId } },
        );
        console.log(
          `Updated DEFAULT_CATEGORY_ID to use customId: ${category.customId}`,
        );
      }
    }

    console.log('System defaults update completed');
  }

  async run() {
    await this.migrateQueues();
    await this.migrateCategories();
    await this.updateSystemDefaults();
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env'],
    }),
    MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    }),
    MongooseModule.forFeature([
      { name: QueueSchemaClass.name, schema: QueueSchema },
      { name: CategorySchemaClass.name, schema: CategorySchema },
    ]),
  ],
  providers: [MigrationService, IdGeneratorService],
})
class MigrationModule {}

async function runMigration() {
  const app = await NestFactory.createApplicationContext(MigrationModule);

  try {
    const migrationService = app.get(MigrationService);
    await migrationService.run();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void runMigration();
