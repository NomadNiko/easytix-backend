// ./easytix-backend/src/files/infrastructure/uploader/s3/files-general.module.ts
import { Module } from '@nestjs/common';
import { FilesGeneralS3Controller } from './files-general.controller';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import { FilesGeneralS3Service } from './files-general.service';
import { DocumentFilePersistenceModule } from '../../persistence/document/document-persistence.module';
import { AllConfigType } from '../../../../config/config.type';

const infrastructurePersistenceModule = DocumentFilePersistenceModule;

@Module({
  imports: [
    infrastructurePersistenceModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const s3 = new S3Client({
          region: configService.get('file.awsS3Region', { infer: true }),
          credentials: {
            accessKeyId: configService.getOrThrow('file.accessKeyId', {
              infer: true,
            }),
            secretAccessKey: configService.getOrThrow('file.secretAccessKey', {
              infer: true,
            }),
          },
        });
        return {
          fileFilter: (request, file, callback) => {
            // Accept all file types for general file uploader
            callback(null, true);
          },
          storage: multerS3({
            s3: s3,
            bucket: configService.getOrThrow('file.awsDefaultS3Bucket', {
              infer: true,
            }),
            contentType: multerS3.AUTO_CONTENT_TYPE,
            key: (request, file, callback) => {
              callback(
                null,
                `files/${randomStringGenerator()}.${
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
  controllers: [FilesGeneralS3Controller],
  providers: [ConfigService, FilesGeneralS3Service],
  exports: [FilesGeneralS3Service],
})
export class FilesGeneralS3Module {}
