import {
  Injectable,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CreatePublicTicketDto } from '../dto/create-public-ticket.dto';
import { TicketsService } from '../tickets.service';
import { UsersService } from '../../users/users.service';
import { MailerService } from '../../mailer/mailer.service';
import { RoleEnum } from '../../roles/roles.enum';
import { StatusEnum } from '../../statuses/statuses.enum';
import { Ticket } from '../domain/ticket';
import { TicketStatus } from '../domain/ticket';
import path from 'path';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';
import { QueuesService } from '../../queues/queues.service';
import { CategoriesService } from '../../categories/categories.service';

@Injectable()
export class PublicTicketService {
  constructor(
    private ticketsService: TicketsService,
    private usersService: UsersService,
    private mailerService: MailerService,
    private configService: ConfigService<AllConfigType>,
    private queuesService: QueuesService,
    private categoriesService: CategoriesService,
  ) {}

  async createPublicTicket(dto: CreatePublicTicketDto): Promise<Ticket> {
    // Get default queue and category from config
    const defaultQueueName = this.configService.getOrThrow(
      'app.defaultQueueName',
      {
        infer: true,
      },
    );
    const defaultCategoryName = this.configService.getOrThrow(
      'app.defaultCategoryName',
      {
        infer: true,
      },
    );

    // Find default queue
    const defaultQueue = await this.queuesService.findByName(defaultQueueName);
    if (!defaultQueue) {
      throw new NotFoundException(
        `Default queue "${defaultQueueName}" not found. Please run database seeds.`,
      );
    }

    // Find default category for the queue
    const defaultCategory = await this.categoriesService.findByNameAndQueue(
      defaultCategoryName,
      defaultQueue.id,
    );
    if (!defaultCategory) {
      throw new NotFoundException(
        `Default category "${defaultCategoryName}" not found for queue "${defaultQueueName}". Please run database seeds.`,
      );
    }

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(dto.email);

    let userId: string;
    let isNewUser = false;
    let randomPassword: string | null = null;

    if (existingUser) {
      // Use existing user
      userId = existingUser.id.toString();
    } else {
      // Generate random password
      randomPassword = this.generateRandomPassword();

      // Create new user
      const newUser = await this.usersService.create({
        email: dto.email,
        password: randomPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        role: {
          id: RoleEnum.user,
        },
        status: {
          id: StatusEnum.active, // Set as active since they're creating a ticket
        },
      });

      userId = newUser.id.toString();
      isNewUser = true;
    }

    // Create ticket with default queue and category
    const ticket = await this.ticketsService.create(userId, {
      queueId: defaultQueue.id,
      categoryId: defaultCategory.id,
      title: dto.title,
      details: dto.details,
      priority: dto.priority,
      documentIds: dto.documentIds || [],
    });

    // Send appropriate email based on whether user is new or existing
    if (isNewUser && randomPassword) {
      // Send welcome email with password and ticket info
      await this.sendWelcomeEmail(dto.email, randomPassword, dto.firstName, ticket.id);
    } else {
      // Send ticket creation notification
      await this.sendTicketCreatedEmail(dto.email, dto.firstName, ticket);
    }

    return ticket;
  }

  private generateRandomPassword(): string {
    // Generate a random password with 12 characters
    const buffer = randomBytes(9); // 9 bytes = 12 base64 characters
    return buffer
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 12);
  }

  private async sendWelcomeEmail(
    email: string,
    password: string,
    firstName: string,
    ticketId: string,
  ): Promise<void> {
    // Import MailService instead of using MailerService directly
    const { MailService } = await import('../../mail/mail.service');
    const mailService = new MailService(this.mailerService, this.configService);
    
    await mailService.welcomePublicTicket({
      to: email,
      data: {
        firstName,
        password,
        ticketId,
      },
    });
  }

  private async sendTicketCreatedEmail(
    email: string,
    firstName: string,
    ticket: Ticket,
  ): Promise<void> {
    // Import MailService instead of using MailerService directly
    const { MailService } = await import('../../mail/mail.service');
    const mailService = new MailService(this.mailerService, this.configService);
    
    await mailService.ticketCreated({
      to: email,
      data: {
        firstName,
        ticket,
        isPublic: true,
      },
    });
  }
}
