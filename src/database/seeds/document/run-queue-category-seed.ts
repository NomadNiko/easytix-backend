import { NestFactory } from '@nestjs/core';
import { QueueSeedService } from './queue/queue-seed.service';
import { CategorySeedService } from './category/category-seed.service';

import { SeedModule } from './seed.module';

const runSeed = async () => {
  const app = await NestFactory.create(SeedModule);

  // run queue and category seeds in order
  await app.get(QueueSeedService).run();
  await app.get(CategorySeedService).run();

  await app.close();
};

void runSeed();
