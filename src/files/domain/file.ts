import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { Transform } from 'class-transformer';
import fileConfig from '../config/file.config';
import { FileConfig, FileDriver } from '../config/file-config.type';
import { AppConfig } from '../../config/app-config.type';
import appConfig from '../../config/app.config';

export class FileType {
  @ApiProperty({
    type: String,
    example: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae',
  })
  @Allow()
  id: string;

  @ApiProperty({
    type: String,
    example: 'https://example.com/path/to/file.jpg',
  })
  @Transform(
    ({ value }) => {
      // Handle local files
      if ((fileConfig() as FileConfig).driver === FileDriver.LOCAL) {
        return (appConfig() as AppConfig).backendDomain + value;
      }
      // For S3 and S3_PRESIGNED, use the direct URL format
      else if (
        [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(
          (fileConfig() as FileConfig).driver,
        )
      ) {
        const bucketName =
          (fileConfig() as FileConfig).awsDefaultS3Bucket ?? '';
        const region = (fileConfig() as FileConfig).awsS3Region ?? '';
        return `https://${bucketName}.s3.${region}.amazonaws.com/${value}`;
      }

      return value;
    },
    {
      toPlainOnly: true,
    },
  )
  path: string;
}
