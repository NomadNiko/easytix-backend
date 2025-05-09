// src/ticket-documents/infrastructure/uploader/file-uploader.service.ts
import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../../config/config.type';
import { FileRepository } from '../../../files/infrastructure/persistence/file.repository';
import { FileType } from '../../../files/domain/file';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { FileDriver } from '../../../files/config/file-config.type';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TicketFileUploaderService {
  private s3: S3Client | null = null;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileRepository: FileRepository,
  ) {
    const fileDriver = this.configService.get('file.driver', { infer: true });

    if (
      fileDriver === FileDriver.S3 ||
      fileDriver === FileDriver.S3_PRESIGNED
    ) {
      this.s3 = new S3Client({
        region: this.configService.get('file.awsS3Region', { infer: true }),
        credentials: {
          accessKeyId: this.configService.getOrThrow('file.accessKeyId', {
            infer: true,
          }),
          secretAccessKey: this.configService.getOrThrow(
            'file.secretAccessKey',
            {
              infer: true,
            },
          ),
        },
      });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    ticketId: string,
  ): Promise<{ file: FileType }> {
    if (!file) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'selectFile',
        },
      });
    }

    const fileDriver = this.configService.get('file.driver', { infer: true });
    const fileName = `${randomStringGenerator()}.${
      file.originalname.split('.').pop()?.toLowerCase() || 'file'
    }`;

    // Path structure: /files/tickets/{ticketId}/{fileName}
    const filePath = `files/tickets/${ticketId}/${fileName}`;

    if (
      fileDriver === FileDriver.S3 ||
      fileDriver === FileDriver.S3_PRESIGNED
    ) {
      // S3 Upload
      await this.uploadToS3(file, filePath);
    } else {
      // Local Upload
      await this.uploadToLocal(file, ticketId, fileName);
    }

    // Create file record in database
    return {
      file: await this.fileRepository.create({
        path: filePath,
      }),
    };
  }

  private async uploadToS3(
    file: Express.Multer.File,
    filePath: string,
  ): Promise<void> {
    if (!this.s3) {
      throw new Error('S3 client not initialized');
    }

    const bucket = this.configService.getOrThrow('file.awsDefaultS3Bucket', {
      infer: true,
    });

    // Create S3 upload command
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filePath,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    // Execute the upload
    await this.s3.send(command);
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    ticketId: string,
    fileName: string,
  ): Promise<void> {
    // Create directories if they don't exist
    const uploadPath = path.join('./files/tickets', ticketId);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Write file to disk
    const filePath = path.join(uploadPath, fileName);
    fs.writeFileSync(filePath, file.buffer);
  }
}
