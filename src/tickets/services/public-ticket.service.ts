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

    if (existingUser) {
      // Use existing user
      userId = existingUser.id.toString();
    } else {
      // Generate random password
      const randomPassword = this.generateRandomPassword();

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

      // Send welcome email with password
      await this.sendWelcomeEmail(dto.email, randomPassword, dto.firstName);
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

    // If existing user, send ticket creation notification
    if (!isNewUser) {
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
  ): Promise<void> {
    const workingDirectory = this.configService.getOrThrow(
      'app.workingDirectory',
      {
        infer: true,
      },
    );

    // Create a simple template for welcome email
    const templatePath = path.join(
      workingDirectory,
      'src',
      'mail',
      'mail-templates',
      'activation.hbs',
    );

    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome to EasyTix - Your Account Has Been Created',
      text: `Hello ${firstName},\n\nYour account has been created successfully while submitting a support ticket.\n\nYour login credentials:\nEmail: ${email}\nPassword: ${password}\n\nPlease keep this password safe. You can change it after logging in to your account.\n\nYour ticket has been submitted and our team will respond shortly.\n\nBest regards,\nThe EasyTix Team`,
      templatePath: templatePath,
      context: {
        title: 'Welcome to EasyTix',
        actionTitle: 'Sign In to Your Account',
        app_name: this.configService.get('app.name', { infer: true }),
        text1: `Hello ${firstName}!`,
        text2: `Your account has been created successfully. Your password is: ${password}`,
        text3:
          'Please keep this password safe. You can change it after logging in.',
        url:
          this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
          '/sign-in',
      },
    });
  }

  private async sendTicketCreatedEmail(
    email: string,
    firstName: string,
    ticket: Ticket,
  ): Promise<void> {
    const workingDirectory = this.configService.getOrThrow(
      'app.workingDirectory',
      {
        infer: true,
      },
    );

    // Reuse the activation template
    const templatePath = path.join(
      workingDirectory,
      'src',
      'mail',
      'mail-templates',
      'activation.hbs',
    );

    await this.mailerService.sendMail({
      to: email,
      subject: `Ticket Created: ${ticket.title}`,
      text: `Hello ${firstName},\n\nYour support ticket has been created successfully.\n\nTicket ID: ${ticket.id}\nTitle: ${ticket.title}\nPriority: ${ticket.priority}\n\nOur team will review your ticket and respond shortly.\n\nBest regards,\nThe EasyTix Team`,
      templatePath: templatePath,
      context: {
        title: 'Ticket Created Successfully',
        actionTitle: 'View Your Ticket',
        app_name: this.configService.get('app.name', { infer: true }),
        text1: `Hello ${firstName}!`,
        text2: `Your support ticket "${ticket.title}" has been created successfully.`,
        text3: `Ticket ID: ${ticket.id} | Priority: ${ticket.priority}`,
        url:
          this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
          `/tickets/${ticket.id}`,
      },
    });
  }
}
