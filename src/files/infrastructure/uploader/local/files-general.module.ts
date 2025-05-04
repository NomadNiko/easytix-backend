// ./easytix-backend/src/files/infrastructure/uploader/local/files-general.module.ts
import {
  HttpStatus,
  Module,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FilesGeneralLocalController } from './files-general.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { FilesGeneralLocalService } from './files-general.service';
import { DocumentFilePersistenceModule } from '../../persistence/document/document-persistence.module';
import { AllConfigType } from '../../../../config/config.type';
import { existsSync, mkdirSync } from 'fs';

const infrastructurePersistenceModule = DocumentFilePersistenceModule;

@Module({
  imports: [
    infrastructurePersistenceModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        // Ensure the files/general directory exists
        const uploadPath = './files/general';
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }

        return {
          fileFilter: (request, file, callback) => {
            // Accept all file types for general file uploader
            callback(null, true);
          },
          storage: diskStorage({
            destination: uploadPath,
            filename: (request, file, callback) => {
              callback(
                null,
                `${randomStringGenerator()}.${
                  file.originalname.split('.').pop()?.toLowerCase() || 'file'
                }`,
              );
            },
          }),
          limits: {
            fileSize: configService.get('file.maxFileSize', { infer: true }),
          },
        };
      },
    }),
  ],
  controllers: [FilesGeneralLocalController],
  providers: [ConfigModule, ConfigService, FilesGeneralLocalService],
  exports: [FilesGeneralLocalService],
})
export class FilesGeneralLocalModule {}
