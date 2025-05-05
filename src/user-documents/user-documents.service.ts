// src/user-documents/user-documents.service.ts
import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
  Response,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UserDocumentRepository } from './infrastructure/persistence/user-document.repository';
import { FilesService } from '../files/files.service';
import { UsersService } from '../users/users.service';
import { CreateUserDocumentDto } from './dto/create-user-document.dto';
import { User } from '../users/domain/user';
import { UserDocument } from './domain/user-document';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { AllConfigType } from '../config/config.type';
import { FileDriver } from '../files/config/file-config.type';

@Injectable()
export class UserDocumentsService {
  constructor(
    private readonly userDocumentRepository: UserDocumentRepository,
    private readonly filesService: FilesService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async create(
    userJwtPayload: JwtPayloadType,
    createUserDocumentDto: CreateUserDocumentDto,
  ): Promise<UserDocument> {
    const user = await this.usersService.findById(userJwtPayload.id);
    if (!user) {
      throw new UnauthorizedException();
    }

    const fileObject = await this.filesService.findById(
      createUserDocumentDto.file.id,
    );
    if (!fileObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'fileNotExists',
        },
      });
    }

    return this.userDocumentRepository.create({
      userId: user.id,
      file: fileObject,
      name: createUserDocumentDto.name,
    });
  }

  async findAllByUser(userId: User['id']): Promise<UserDocument[]> {
    return this.userDocumentRepository.findAllByUserId(userId);
  }

  async findById(id: UserDocument['id']): Promise<UserDocument> {
    const document = await this.userDocumentRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async downloadDocument(
    userJwtPayload: JwtPayloadType,
    id: UserDocument['id'],
    response: any,
  ): Promise<any> {
    const document = await this.findById(id);

    // Verify the user has access to this document
    if (document.userId.toString() !== userJwtPayload.id.toString()) {
      throw new UnauthorizedException(
        'You can only download your own documents',
      );
    }

    const fileDriver = this.configService.get('file.driver', { infer: true });

    // For S3 storage, generate a pre-signed URL
    if (
      fileDriver === FileDriver.S3 ||
      fileDriver === FileDriver.S3_PRESIGNED
    ) {
      const region = this.configService.get('file.awsS3Region', {
        infer: true,
      });
      const accessKeyId = this.configService.get('file.accessKeyId', {
        infer: true,
      });
      const secretAccessKey = this.configService.get('file.secretAccessKey', {
        infer: true,
      });
      const bucket = this.configService.get('file.awsDefaultS3Bucket', {
        infer: true,
      });

      if (!region || !accessKeyId || !secretAccessKey || !bucket) {
        throw new Error('Missing S3 configuration');
      }

      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      // Create a command to get the object
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: document.file.path,
      });

      // Generate a pre-signed URL that expires in 5 minutes
      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 300,
      });

      // Redirect to the pre-signed URL
      return response.redirect(signedUrl);
    } else {
      // For local files, serve from the filesystem
      const filePath = document.file.path.replace(
        `/${this.configService.get('app.apiPrefix', { infer: true })}/v1/`,
        '',
      );
      return response.sendFile(filePath, { root: '.' });
    }
  }

  async delete(
    userJwtPayload: JwtPayloadType,
    id: UserDocument['id'],
  ): Promise<void> {
    const document = await this.userDocumentRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.userId.toString() !== userJwtPayload.id.toString()) {
      throw new UnauthorizedException('You can only delete your own documents');
    }

    await this.userDocumentRepository.delete(id);
  }
}
