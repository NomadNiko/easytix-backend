import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MongooseModule } from '@nestjs/mongoose';

import { UserSeedModule } from './user/user-seed.module';
import { QueueSeedModule } from './queue/queue-seed.module';
import { CategorySeedModule } from './category/category-seed.module';
import appConfig from '../../../config/app.config';
import databaseConfig from '../../config/database.config';
import { MongooseConfigService } from '../../mongoose-config.service';

@Module({
  imports: [
    UserSeedModule,
    QueueSeedModule,
    CategorySeedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env'],
    }),
    MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    }),
  ],
})
export class SeedModule {}
