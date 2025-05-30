// src/tickets/tickets.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PublicTicketService } from './services/public-ticket.service';
import {
  TicketSchema,
  TicketSchemaClass,
} from './infrastructure/persistence/document/entities/ticket.schema';
import { TicketRepository } from './infrastructure/persistence/ticket.repository';
import { TicketDocumentRepository } from './infrastructure/persistence/document/repositories/ticket.repository';
import { HistoryItemsModule } from '../history-items/history-items.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { MailerModule } from '../mailer/mailer.module';
import { QueuesModule } from '../queues/queues.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TicketSchemaClass.name, schema: TicketSchema },
    ]),
    forwardRef(() => HistoryItemsModule),
    NotificationsModule,
    UsersModule,
    MailModule,
    MailerModule,
    QueuesModule,
    CategoriesModule,
  ],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    PublicTicketService,
    {
      provide: TicketRepository,
      useClass: TicketDocumentRepository,
    },
  ],
  exports: [TicketsService, TicketRepository],
})
export class TicketsModule {}
