// src/tickets/tickets.service.ts
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { HistoryItemsService } from '../history-items/history-items.service';
import { RoleEnum } from '../roles/roles.enum';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket, TicketPriority, TicketStatus } from './domain/ticket';
import { TicketRepository } from './infrastructure/persistence/ticket.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { HistoryItemType } from '../history-items/domain/history-item';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { QueuesService } from '../queues/queues.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketRepository: TicketRepository,
    @Inject(forwardRef(() => HistoryItemsService))
    private readonly historyItemsService: HistoryItemsService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
    private readonly queuesService: QueuesService,
  ) {}

  async create(
    userId: string,
    createTicketDto: CreateTicketDto,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepository.create({
      queueId: createTicketDto.queueId,
      categoryId: createTicketDto.categoryId,
      title: createTicketDto.title,
      details: createTicketDto.details,
      status: TicketStatus.OPENED,
      priority: createTicketDto.priority,
      assignedToId: null,
      createdById: userId,
      documentIds: createTicketDto.documentIds || [],
    });

    // Create history item for ticket creation
    await this.historyItemsService.create({
      ticketId: ticket.id,
      userId: userId,
      type: HistoryItemType.CREATED,
      details: 'Ticket created',
    });

    // 1) Notification: When a user opens a ticket, send them a notification
    await this.notificationsService.create({
      userId: userId,
      title: 'Ticket Created',
      message: `You have created a new ticket: "${ticket.title}"`,
      isRead: false,
      link: `/tickets/${ticket.id}`,
      linkLabel: 'View Ticket',
    });

    // Send email notification for ticket creation
    const createdByUser = await this.usersService.findById(userId);
    if (createdByUser && createdByUser.email) {
      await this.mailService.ticketCreated({
        to: createdByUser.email,
        data: {
          firstName: createdByUser.firstName || 'User',
          ticket,
          isPublic: false,
        },
      });
    }

    // If high priority ticket, send alert to queue users and security
    if (createTicketDto.priority === TicketPriority.HIGH) {
      // Send to security@nomadsoft.us
      await this.mailService.highPriorityTicketAlert({
        to: 'security@nomadsoft.us',
        data: {
          ticket,
          submittedBy: createdByUser?.email || userId,
        },
      });

      // Send to queue users
      const queue = await this.queuesService.findById(createTicketDto.queueId);
      if (queue && queue.assignedUserIds) {
        for (const assignedUserId of queue.assignedUserIds) {
          const queueUser = await this.usersService.findById(assignedUserId);
          if (queueUser && queueUser.email) {
            await this.mailService.highPriorityTicketAlert({
              to: queueUser.email,
              data: {
                ticket,
                submittedBy: createdByUser?.email || userId,
                recipientName: queueUser.firstName || undefined,
              },
            });
          }
        }
      }
    }

    return ticket;
  }

  async findAll(
    paginationOptions: IPaginationOptions,
    filters?: {
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: string;
      assignedToId?: string;
      createdById?: string;
      search?: string;
    },
  ): Promise<Ticket[]> {
    // Convert string priority to enum if it exists
    const formattedFilters = filters
      ? {
          ...filters,
          priority: filters.priority
            ? (filters.priority as TicketPriority) // Type assertion for valid enum values
            : undefined,
        }
      : undefined;
    return this.ticketRepository.findAll(paginationOptions, formattedFilters);
  }

  async findById(id: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findById(id);
    const oldTicket = { ...ticket }; // Save old state to compare changes

    const updatedTicket = await this.ticketRepository.update(
      id,
      updateTicketDto,
    );
    if (!updatedTicket) {
      throw new NotFoundException('Ticket not found');
    }

    // Handle notifications for category and priority changes
    if (
      updateTicketDto.categoryId &&
      updateTicketDto.categoryId !== oldTicket.categoryId
    ) {
      await this.historyItemsService.create({
        ticketId: id,
        userId: 'system', // You might want to pass the actual user ID here
        type: HistoryItemType.CATEGORY_CHANGED,
        details: `Category changed to ${updateTicketDto.categoryId}`,
      });
    }

    if (
      updateTicketDto.priority &&
      updateTicketDto.priority !== oldTicket.priority
    ) {
      await this.historyItemsService.create({
        ticketId: id,
        userId: 'system', // You might want to pass the actual user ID here
        type: HistoryItemType.PRIORITY_CHANGED,
        details: `Priority changed to ${updateTicketDto.priority}`,
      });

      // Send email notification for priority change
      const ticketCreator = await this.usersService.findById(updatedTicket.createdById);
      if (ticketCreator && ticketCreator.email) {
        await this.mailService.ticketPriorityChanged({
          to: ticketCreator.email,
          data: {
            ticket: updatedTicket,
            oldPriority: oldTicket.priority,
            newPriority: updateTicketDto.priority,
            userName: ticketCreator.firstName || 'User',
          },
        });
      }

      // If changed to high priority, send alerts
      if (updateTicketDto.priority === TicketPriority.HIGH) {
        await this.mailService.highPriorityTicketAlert({
          to: 'security@nomadsoft.us',
          data: {
            ticket: updatedTicket,
            submittedBy: ticketCreator?.email || updatedTicket.createdById,
          },
        });

        const queue = await this.queuesService.findById(updatedTicket.queueId);
        if (queue && queue.assignedUserIds) {
          for (const assignedUserId of queue.assignedUserIds) {
            const queueUser = await this.usersService.findById(assignedUserId);
            if (queueUser && queueUser.email) {
              await this.mailService.highPriorityTicketAlert({
                to: queueUser.email,
                data: {
                  ticket: updatedTicket,
                  submittedBy: ticketCreator?.email || updatedTicket.createdById,
                  recipientName: queueUser.firstName || undefined,
                },
              });
            }
          }
        }
      }
    }

    return updatedTicket;
  }

  async assign(
    userId: string,
    ticketId: string,
    assigneeId: string,
  ): Promise<Ticket> {
    const ticket = await this.findById(ticketId);
    const oldAssigneeId = ticket.assignedToId;
    const updated = await this.ticketRepository.update(ticketId, {
      assignedToId: assigneeId,
    });
    if (!updated) {
      throw new NotFoundException('Ticket not found');
    }

    // Create history item for assignment
    await this.historyItemsService.create({
      ticketId,
      userId,
      type: HistoryItemType.ASSIGNED,
      details: `Ticket assigned ${
        oldAssigneeId ? 'from user ' + oldAssigneeId + ' ' : ''
      }to user ${assigneeId}`,
    });

    // 2) Notification: When a user is assigned to a ticket, notify them
    await this.notificationsService.create({
      userId: assigneeId,
      title: 'Ticket Assigned',
      message: `You have been assigned to ticket: "${ticket.title}"`,
      isRead: false,
      link: `/tickets/${ticket.id}`,
      linkLabel: 'View Ticket',
    });

    // Send email to ticket creator about assignment
    const ticketCreator = await this.usersService.findById(updated.createdById);
    const assignedUser = await this.usersService.findById(assigneeId);
    
    if (ticketCreator && assignedUser && ticketCreator.email) {
      await this.mailService.ticketAssigned({
        to: ticketCreator.email,
        data: {
          agentName: `${assignedUser.firstName} ${assignedUser.lastName}`,
          ticket: updated,
          userName: ticketCreator.firstName || 'User',
        },
      });
    }

    return updated;
  }

  async updateStatus(
    userId: string,
    ticketId: string,
    status: TicketStatus,
  ): Promise<Ticket> {
    const ticket = await this.findById(ticketId);
    const oldStatus = ticket.status;
    
    if (ticket.status === status) {
      return ticket; // No change needed
    }

    const updated = await this.ticketRepository.update(ticketId, {
      status,
    });
    if (!updated) {
      throw new NotFoundException('Ticket not found');
    }

    // Create history item for status change
    await this.historyItemsService.create({
      ticketId,
      userId,
      type:
        status === TicketStatus.CLOSED
          ? HistoryItemType.CLOSED
          : HistoryItemType.REOPENED,
      details: `Ticket ${
        status === TicketStatus.CLOSED ? 'closed' : 'reopened'
      }`,
    });

    // 3) Notification: When a ticket a user opens is closed or reopened, notify them
    if (ticket.createdById && ticket.createdById !== userId) {
      await this.notificationsService.create({
        userId: ticket.createdById,
        title: `Ticket ${
          status === TicketStatus.CLOSED ? 'Closed' : 'Reopened'
        }`,
        message: `Your ticket "${ticket.title}" has been ${
          status === TicketStatus.CLOSED ? 'closed' : 'reopened'
        }.`,
        isRead: false,
        link: `/tickets/${ticket.id}`,
        linkLabel: 'View Ticket',
      });
    }

    // 5) Notification: When a ticket a user is assigned to changes status, notify them
    if (
      ticket.assignedToId &&
      ticket.assignedToId !== userId &&
      ticket.assignedToId !== ticket.createdById
    ) {
      await this.notificationsService.create({
        userId: ticket.assignedToId,
        title: `Ticket ${
          status === TicketStatus.CLOSED ? 'Closed' : 'Reopened'
        }`,
        message: `Ticket "${ticket.title}" that you are assigned to has been ${
          status === TicketStatus.CLOSED ? 'closed' : 'reopened'
        }.`,
        isRead: false,
        link: `/tickets/${ticket.id}`,
        linkLabel: 'View Ticket',
      });
    }

    // Send email notifications for status changes
    const ticketCreator = await this.usersService.findById(updated.createdById);
    if (ticketCreator && ticketCreator.email) {
      // Map TicketStatus enum to display strings
      const statusMap = {
        [TicketStatus.OPENED]: 'Opened',
        [TicketStatus.CLOSED]: 'Closed',
      };
      
      // Special handling for resolved status (using closed with resolution message)
      if (oldStatus === TicketStatus.OPENED && status === TicketStatus.CLOSED) {
        // This could be a resolution - send both resolved and closed emails
        await this.mailService.ticketResolved({
          to: ticketCreator.email,
          data: {
            ticket: updated,
            userName: ticketCreator.firstName || 'User',
            resolutionSummary: 'Your issue has been resolved by our support team.',
          },
        });
      }
      
      // Always send status change email
      await this.mailService.ticketStatusChanged({
        to: ticketCreator.email,
        data: {
          ticket: updated,
          oldStatus: statusMap[oldStatus],
          newStatus: statusMap[status],
          userName: ticketCreator.firstName || 'User',
        },
      });

      // Send specific closed email if closing
      if (status === TicketStatus.CLOSED) {
        await this.mailService.ticketClosed({
          to: ticketCreator.email,
          data: {
            ticket: updated,
            userName: ticketCreator.firstName || 'User',
          },
        });
      }
    }

    return updated;
  }

  async addDocument(
    userId: string,
    ticketId: string,
    documentId: string,
  ): Promise<Ticket> {
    const ticket = await this.findById(ticketId);
    const updated = await this.ticketRepository.addDocument(
      ticketId,
      documentId,
    );
    if (!updated) {
      throw new NotFoundException('Ticket not found');
    }

    // Create history item for document addition
    await this.historyItemsService.create({
      ticketId,
      userId,
      type: HistoryItemType.DOCUMENT_ADDED,
      details: `Document added: ${documentId}`,
    });

    return updated;
  }

  async removeDocument(
    userId: string,
    ticketId: string,
    documentId: string,
  ): Promise<Ticket> {
    const ticket = await this.findById(ticketId);
    const updated = await this.ticketRepository.removeDocument(
      ticketId,
      documentId,
    );
    if (!updated) {
      throw new NotFoundException('Ticket not found');
    }

    // Create history item for document removal
    await this.historyItemsService.create({
      ticketId,
      userId,
      type: HistoryItemType.DOCUMENT_REMOVED,
      details: `Document removed: ${documentId}`,
    });

    return updated;
  }

  async remove(user: JwtPayloadType, id: string): Promise<void> {
    const ticket = await this.findById(id);
    // Add null check for user.role
    const userRoleId = user.role?.id;
    // Only admins or the creator can delete tickets
    if (userRoleId !== RoleEnum.admin && user.id !== ticket.createdById) {
      throw new ForbiddenException(
        'You do not have permission to delete this ticket',
      );
    }

    // Notify assignee if the ticket is being deleted and they're not the one deleting it
    if (ticket.assignedToId && ticket.assignedToId !== user.id) {
      await this.notificationsService.create({
        userId: ticket.assignedToId,
        title: 'Ticket Deleted',
        message: `Ticket "${ticket.title}" that was assigned to you has been deleted.`,
        isRead: false,
      });
    }

    // Notify creator if the ticket is being deleted by admin and not by themselves
    if (ticket.createdById !== user.id) {
      await this.notificationsService.create({
        userId: ticket.createdById,
        title: 'Your Ticket Deleted',
        message: `Your ticket "${ticket.title}" has been deleted.`,
        isRead: false,
      });
    }

    await this.ticketRepository.remove(id);
  }
}
