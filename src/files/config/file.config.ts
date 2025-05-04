import { registerAs } from '@nestjs/config';
import { IsEnum, IsString, IsOptional, ValidateIf } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { FileDriver, FileConfig } from './file-config.type';

class EnvironmentVariablesValidator {
  @IsEnum(FileDriver)
  @IsOptional()
  FILE_DRIVER: FileDriver;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  @IsOptional()
  ACCESS_KEY_ID: string;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  @IsOptional()
  SECRET_ACCESS_KEY: string;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  @IsOptional()
  AWS_DEFAULT_S3_BUCKET: string;

  @ValidateIf((envValues) =>
    [FileDriver.S3, FileDriver.S3_PRESIGNED].includes(envValues.FILE_DRIVER),
  )
  @IsString()
  @IsOptional()
  AWS_S3_REGION: string;

  @ValidateIf((envValues) => [FileDriver.S3].includes(envValues.FILE_DRIVER))
  @IsString()
  @IsOptional()
  AWS_S3_PUBLIC_ACCESS: string; // Changed from IsBoolean to IsString with optional
}

export default registerAs<FileConfig>('file', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return {
    driver:
      (process.env.FILE_DRIVER as FileDriver | undefined) ?? FileDriver.LOCAL,
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    awsDefaultS3Bucket: process.env.AWS_DEFAULT_S3_BUCKET,
    awsS3Region: process.env.AWS_S3_REGION,
    maxFileSize: 20971520, // 20mb
    // Convert the string to boolean
    awsS3PublicAccess: process.env.AWS_S3_PUBLIC_ACCESS === 'true',
  };
});
