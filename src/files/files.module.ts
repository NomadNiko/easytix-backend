// src/files/files.module.ts
import {
  // common
  Module,
} from '@nestjs/common';
import { DocumentFilePersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import { FilesService } from './files.service';
import fileConfig from './config/file.config';
import { FileConfig, FileDriver } from './config/file-config.type';
import { FilesLocalModule } from './infrastructure/uploader/local/files.module';
import { FilesS3Module } from './infrastructure/uploader/s3/files.module';
import { FilesS3PresignedModule } from './infrastructure/uploader/s3-presigned/files.module';
import { FilesGeneralLocalModule } from './infrastructure/uploader/local/files-general.module';
import { FilesGeneralS3Module } from './infrastructure/uploader/s3/files-general.module';

const infrastructurePersistenceModule = DocumentFilePersistenceModule;

// For Files endpoint (avatar images)
const infrastructureUploaderModule =
  (fileConfig() as FileConfig).driver === FileDriver.LOCAL
    ? FilesLocalModule
    : (fileConfig() as FileConfig).driver === FileDriver.S3
      ? FilesS3Module
      : FilesS3PresignedModule;

// For General Files endpoint (documents) - use direct upload for all cases
const infrastructureGeneralUploaderModule =
  (fileConfig() as FileConfig).driver === FileDriver.LOCAL
    ? FilesGeneralLocalModule
    : FilesGeneralS3Module; // Always use direct S3 module, even for presigned driver

@Module({
  imports: [
    // import modules, etc.
    infrastructurePersistenceModule,
    infrastructureUploaderModule,
    infrastructureGeneralUploaderModule,
  ],
  providers: [FilesService],
  exports: [FilesService, infrastructurePersistenceModule],
})
export class FilesModule {}
