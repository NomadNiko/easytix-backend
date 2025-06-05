// src/ticket-documents/ticket-documents.service.ts
import {
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TicketDocumentRepository } from './infrastructure/persistence/ticket-document.repository';
import { FilesService } from '../files/files.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateTicketDocumentDto } from './dto/create-ticket-document.dto';
import { TicketDocument } from './domain/ticket-document';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { AllConfigType } from '../config/config.type';
import { FileDriver } from '../files/config/file-config.type';
import { TicketFileUploaderService } from './infrastructure/uploader/file-uploader.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationPreferenceService } from '../users/services/notification-preference.service';

@Injectable()
export class TicketDocumentsService {
  private s3: S3Client | null = null;
  constructor(
    private readonly ticketDocumentRepository: TicketDocumentRepository,
    private readonly filesService: FilesService,
    private readonly ticketsService: TicketsService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly fileUploaderService: TicketFileUploaderService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationPreferenceService: NotificationPreferenceService,
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

  async uploadFile(file: Express.Multer.File, ticketId: string) {
    // Verify ticket exists and user has permission
    const ticket = await this.ticketsService.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    // Upload the file
    return this.fileUploaderService.uploadFile(file, ticketId);
  }

  async create(
    userJwtPayload: JwtPayloadType,
    createTicketDocumentDto: CreateTicketDocumentDto,
  ): Promise<TicketDocument> {
    // Verify the ticket exists
    const ticket = await this.ticketsService.findById(
      createTicketDocumentDto.ticketId,
    );
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    // Verify the file exists
    const fileObject = await this.filesService.findById(
      createTicketDocumentDto.file.id,
    );
    if (!fileObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          file: 'fileNotExists',
        },
      });
    }

    // Create the ticket document
    const document = await this.ticketDocumentRepository.create({
      ticketId: createTicketDocumentDto.ticketId,
      file: fileObject,
      name: createTicketDocumentDto.name,
    });

    // 1) Notification: When anyone uploads a document to a ticket, notify the person that opened the ticket
    if (
      ticket.createdById &&
      ticket.createdById !== userJwtPayload.id &&
      (await this.notificationPreferenceService.shouldSendNotification(
        ticket.createdById,
        'documentAdded',
      ))
    ) {
      await this.notificationsService.create({
        userId: ticket.createdById,
        title: 'Document Added to Your Ticket',
        message: `A new document "${createTicketDocumentDto.name}" has been added to your ticket: "${ticket.title}"`,
        isRead: false,
        link: `/tickets/${ticket.id}`,
        linkLabel: 'View Ticket',
      });
    }

    // 2) Notification: When a document is uploaded to a ticket, notify the assignee (if different from uploader)
    if (
      ticket.assignedToId &&
      ticket.assignedToId !== userJwtPayload.id &&
      ticket.assignedToId !== ticket.createdById &&
      (await this.notificationPreferenceService.shouldSendNotification(
        ticket.assignedToId,
        'documentAdded',
      ))
    ) {
      await this.notificationsService.create({
        userId: ticket.assignedToId,
        title: 'Document Added to Assigned Ticket',
        message: `A new document "${createTicketDocumentDto.name}" has been added to ticket "${ticket.title}" assigned to you.`,
        isRead: false,
        link: `/tickets/${ticket.id}`,
        linkLabel: 'View Ticket',
      });
    }

    return document;
  }

  async findAllByTicketId(ticketId: string): Promise<TicketDocument[]> {
    // Verify the ticket exists
    const ticket = await this.ticketsService.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return this.ticketDocumentRepository.findAllByTicketId(ticketId);
  }

  async findById(id: TicketDocument['id']): Promise<TicketDocument> {
    const document = await this.ticketDocumentRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async downloadDocument(
    ticketId: string,
    documentId: string,
    response: any,
  ): Promise<any> {
    // Verify the ticket exists
    const ticket = await this.ticketsService.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    // Get the document
    const document = await this.findById(documentId);
    if (document.ticketId !== ticketId) {
      throw new UnauthorizedException(
        'Document does not belong to this ticket',
      );
    }
    const fileDriver = this.configService.get('file.driver', { infer: true });
    // For S3 storage, generate a pre-signed URL
    if (
      fileDriver === FileDriver.S3 ||
      fileDriver === FileDriver.S3_PRESIGNED
    ) {
      if (!this.s3) {
        throw new Error('S3 client not initialized');
      }
      const region = this.configService.get('file.awsS3Region', {
        infer: true,
      });
      const bucket = this.configService.get('file.awsDefaultS3Bucket', {
        infer: true,
      });
      if (!region || !bucket) {
        throw new Error('Missing S3 configuration');
      }
      // Create a command to get the object
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: document.file.path,
      });
      // Generate a pre-signed URL that expires in 5 minutes
      const signedUrl = await getSignedUrl(this.s3, command, {
        expiresIn: 300,
      });
      // Redirect to the pre-signed URL
      return response.redirect(signedUrl);
    } else {
      // For local files, serve from the filesystem
      return response.sendFile(document.file.path, { root: '.' });
    }
  }

  async delete(
    userJwtPayload: JwtPayloadType,
    ticketId: string,
    documentId: string,
  ): Promise<void> {
    // Verify the ticket exists
    const ticket = await this.ticketsService.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    // Get the document
    const document = await this.ticketDocumentRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    // Verify the document belongs to the ticket
    if (document.ticketId !== ticketId) {
      throw new UnauthorizedException(
        'Document does not belong to this ticket',
      );
    }

    // Delete the document
    await this.ticketDocumentRepository.delete(documentId);

    // Notification: When a document is removed, notify relevant users
    // Notify ticket creator if they didn't delete it
    if (
      ticket.createdById &&
      ticket.createdById !== userJwtPayload.id &&
      (await this.notificationPreferenceService.shouldSendNotification(
        ticket.createdById,
        'documentRemoved',
      ))
    ) {
      await this.notificationsService.create({
        userId: ticket.createdById,
        title: 'Document Removed from Your Ticket',
        message: `A document "${document.name}" has been removed from your ticket: "${ticket.title}"`,
        isRead: false,
        link: `/tickets/${ticket.id}`,
        linkLabel: 'View Ticket',
      });
    }

    // Notify ticket assignee if they exist and didn't delete it
    if (
      ticket.assignedToId &&
      ticket.assignedToId !== userJwtPayload.id &&
      ticket.assignedToId !== ticket.createdById &&
      (await this.notificationPreferenceService.shouldSendNotification(
        ticket.assignedToId,
        'documentRemoved',
      ))
    ) {
      await this.notificationsService.create({
        userId: ticket.assignedToId,
        title: 'Document Removed from Assigned Ticket',
        message: `A document "${document.name}" has been removed from ticket "${ticket.title}" assigned to you.`,
        isRead: false,
        link: `/tickets/${ticket.id}`,
        linkLabel: 'View Ticket',
      });
    }
  }
}
