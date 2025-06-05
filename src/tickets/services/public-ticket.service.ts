import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CreatePublicTicketDto } from '../dto/create-public-ticket.dto';
import { TicketsService } from '../tickets.service';
import { UsersService } from '../../users/users.service';
import { MailerService } from '../../mailer/mailer.service';
import { RoleEnum } from '../../roles/roles.enum';
import { StatusEnum } from '../../statuses/statuses.enum';
import { Ticket } from '../domain/ticket';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';
import { QueuesService } from '../../queues/queues.service';
import { CategoriesService } from '../../categories/categories.service';
import { SystemDefaultsService } from '../../system-defaults/system-defaults.service';

@Injectable()
export class PublicTicketService {
  constructor(
    private ticketsService: TicketsService,
    private usersService: UsersService,
    private mailerService: MailerService,
    private configService: ConfigService<AllConfigType>,
    private queuesService: QueuesService,
    private categoriesService: CategoriesService,
    private systemDefaultsService: SystemDefaultsService,
  ) {}

  async createPublicTicket(dto: CreatePublicTicketDto): Promise<Ticket> {
    // Get default queue and category from SystemDefaults
    const defaultQueueId = await this.systemDefaultsService.getDefaultQueueId();
    if (!defaultQueueId) {
      throw new NotFoundException(
        'Default queue not configured. Please contact an administrator to set up system defaults.',
      );
    }

    const defaultCategoryId =
      await this.systemDefaultsService.getDefaultCategoryId();
    if (!defaultCategoryId) {
      throw new NotFoundException(
        'Default category not configured. Please contact an administrator to set up system defaults.',
      );
    }

    // Verify that the default queue and category exist by customId
    const defaultQueue =
      await this.queuesService.findByCustomId(defaultQueueId);
    if (!defaultQueue) {
      throw new NotFoundException(
        `Default queue with ID "${defaultQueueId}" not found. Please contact an administrator.`,
      );
    }

    const defaultCategory =
      await this.categoriesService.findByCustomId(defaultCategoryId);
    if (!defaultCategory) {
      throw new NotFoundException(
        `Default category with ID "${defaultCategoryId}" not found. Please contact an administrator.`,
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

    // Create ticket with default queue and category (using MongoDB _id)
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
      await this.sendWelcomeEmail(
        dto.email,
        randomPassword,
        dto.firstName,
        ticket.id,
      );
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
