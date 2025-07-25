import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';

import { UsersService } from './users.service';
import { DocumentUserPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { FilesModule } from '../files/files.module';
import { UserCreateService } from './services/user-create.service';
import { UserReadService } from './services/user-read.service';
import { UserUpdateService } from './services/user-update.service';
import { UserDeleteService } from './services/user-delete.service';
import { NotificationPreferenceService } from './services/notification-preference.service';

const infrastructurePersistenceModule = DocumentUserPersistenceModule;

@Module({
  imports: [infrastructurePersistenceModule, FilesModule],
  controllers: [UsersController],
  providers: [
    UserCreateService,
    UserReadService,
    UserUpdateService,
    UserDeleteService,
    NotificationPreferenceService,
    UsersService,
  ],
  exports: [
    UsersService,
    NotificationPreferenceService,
    infrastructurePersistenceModule,
  ],
})
export class UsersModule {}
