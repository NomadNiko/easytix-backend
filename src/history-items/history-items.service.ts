// src/history-items/history-items.service.ts
import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CreateHistoryItemDto } from './dto/create-history-item.dto';
import { HistoryItem, HistoryItemType } from './domain/history-item';
import { HistoryItemRepository } from './infrastructure/persistence/history-item.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { TicketsService } from '../tickets/tickets.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { NotificationPreferenceService } from '../users/services/notification-preference.service';

@Injectable()
export class HistoryItemsService {
  constructor(
    private readonly historyItemRepository: HistoryItemRepository,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
    private readonly notificationPreferenceService: NotificationPreferenceService,
  ) {}

  async create(
    createHistoryItemDto: CreateHistoryItemDto & { userId: string },
  ): Promise<HistoryItem> {
    const historyItem = await this.historyItemRepository.create({
      ticketId: createHistoryItemDto.ticketId,
      userId: createHistoryItemDto.userId,
      type: createHistoryItemDto.type,
      details: createHistoryItemDto.details,
    });

    // Get the ticket to determine who to notify
    try {
      const ticket = await this.ticketsService.findById(
        createHistoryItemDto.ticketId,
      );

      // Handle notifications based on history item type
      switch (createHistoryItemDto.type) {
        case HistoryItemType.COMMENT:
          // Get comment author info
          const commentAuthor = await this.usersService.findById(
            createHistoryItemDto.userId,
          );
          const commentAuthorName = commentAuthor
            ? `${commentAuthor.firstName} ${commentAuthor.lastName}`
            : 'A user';

          // 4) Notify the ticket creator if they aren't the one who added the comment
          if (
            ticket.createdById &&
            ticket.createdById !== createHistoryItemDto.userId
          ) {
            if (
              await this.notificationPreferenceService.shouldSendNotification(
                ticket.createdById,
                'newComment',
              )
            ) {
              await this.notificationsService.create({
                userId: ticket.createdById,
                title: 'New Comment on Your Ticket',
                message: `A new comment has been added to your ticket: "${ticket.title}"`,
                isRead: false,
                link: `/tickets/${ticket.id}`,
                linkLabel: 'View Comment',
              });
            }

            // Send email notification
            const ticketCreator = await this.usersService.findById(
              ticket.createdById,
            );
            if (
              ticketCreator &&
              ticketCreator.email &&
              (await this.notificationPreferenceService.shouldSendEmail(
                ticket.createdById,
                'newComment',
              ))
            ) {
              await this.mailService.newComment({
                to: ticketCreator.email,
                data: {
                  ticket,
                  commentAuthor: commentAuthorName,
                  commentPreview:
                    createHistoryItemDto.details.substring(0, 100) +
                    (createHistoryItemDto.details.length > 100 ? '...' : ''),
                  userName: ticketCreator.firstName || 'User',
                },
              });
            }
          }

          // 5) Notify the ticket assignee if they exist and aren't the one who added the comment
          if (
            ticket.assignedToId &&
            ticket.assignedToId !== createHistoryItemDto.userId &&
            ticket.assignedToId !== ticket.createdById &&
            (await this.notificationPreferenceService.shouldSendNotification(
              ticket.assignedToId,
              'newComment',
            ))
          ) {
            // Avoid duplicate notifications
            await this.notificationsService.create({
              userId: ticket.assignedToId,
              title: 'New Comment on Assigned Ticket',
              message: `A new comment has been added to ticket "${ticket.title}" assigned to you.`,
              isRead: false,
              link: `/tickets/${ticket.id}`,
              linkLabel: 'View Comment',
            });
          }
          break;

        case HistoryItemType.PRIORITY_CHANGED:
          // Notify about priority changes
          if (
            ticket.createdById &&
            ticket.createdById !== createHistoryItemDto.userId &&
            (await this.notificationPreferenceService.shouldSendNotification(
              ticket.createdById,
              'priorityChanged',
            ))
          ) {
            await this.notificationsService.create({
              userId: ticket.createdById,
              title: 'Ticket Priority Changed',
              message: `The priority of your ticket "${ticket.title}" has been changed.`,
              isRead: false,
              link: `/tickets/${ticket.id}`,
              linkLabel: 'View Ticket',
            });
          }

          if (
            ticket.assignedToId &&
            ticket.assignedToId !== createHistoryItemDto.userId &&
            ticket.assignedToId !== ticket.createdById &&
            (await this.notificationPreferenceService.shouldSendNotification(
              ticket.assignedToId,
              'priorityChanged',
            ))
          ) {
            await this.notificationsService.create({
              userId: ticket.assignedToId,
              title: 'Priority Changed on Assigned Ticket',
              message: `The priority of ticket "${ticket.title}" assigned to you has been changed.`,
              isRead: false,
              link: `/tickets/${ticket.id}`,
              linkLabel: 'View Ticket',
            });
          }
          break;

        case HistoryItemType.CATEGORY_CHANGED:
          // Notify about category changes
          if (
            ticket.createdById &&
            ticket.createdById !== createHistoryItemDto.userId &&
            (await this.notificationPreferenceService.shouldSendNotification(
              ticket.createdById,
              'categoryChanged',
            ))
          ) {
            await this.notificationsService.create({
              userId: ticket.createdById,
              title: 'Ticket Category Changed',
              message: `The category of your ticket "${ticket.title}" has been changed.`,
              isRead: false,
              link: `/tickets/${ticket.id}`,
              linkLabel: 'View Ticket',
            });
          }

          if (
            ticket.assignedToId &&
            ticket.assignedToId !== createHistoryItemDto.userId &&
            ticket.assignedToId !== ticket.createdById &&
            (await this.notificationPreferenceService.shouldSendNotification(
              ticket.assignedToId,
              'categoryChanged',
            ))
          ) {
            await this.notificationsService.create({
              userId: ticket.assignedToId,
              title: 'Category Changed on Assigned Ticket',
              message: `The category of ticket "${ticket.title}" assigned to you has been changed.`,
              isRead: false,
              link: `/tickets/${ticket.id}`,
              linkLabel: 'View Ticket',
            });
          }
          break;

        // The status changes are handled in TicketsService
      }
    } catch (error) {
      // If there's an error getting the ticket, we'll still return the history item
      // but won't send notifications
      console.error('Error sending notification for history item:', error);
    }

    return historyItem;
  }

  async findById(id: string): Promise<HistoryItem> {
    const historyItem = await this.historyItemRepository.findById(id);
    if (!historyItem) {
      throw new NotFoundException('History item not found');
    }
    return historyItem;
  }

  async findByTicketId(ticketId: string): Promise<HistoryItem[]> {
    return this.historyItemRepository.findByTicketId(ticketId);
  }

  async findByTicketIds(ticketIds: string[]): Promise<HistoryItem[]> {
    return this.historyItemRepository.findByTicketIds(ticketIds);
  }
}
