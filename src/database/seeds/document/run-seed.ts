import { NestFactory } from '@nestjs/core';
import { UserSeedService } from './user/user-seed.service';
import { QueueSeedService } from './queue/queue-seed.service';
import { CategorySeedService } from './category/category-seed.service';
import { SystemDefaultSeedService } from './system-default/system-default-seed.service';

import { SeedModule } from './seed.module';

const runSeed = async () => {
  const app = await NestFactory.create(SeedModule);

  // run seeds in order
  await app.get(UserSeedService).run();
  await app.get(QueueSeedService).run();
  await app.get(CategorySeedService).run();
  await app.get(SystemDefaultSeedService).run();

  await app.close();
};

void runSeed();
