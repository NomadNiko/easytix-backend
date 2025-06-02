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
import { NotificationPreferenceService } from '../users/services/notification-preference.service';
import { infinityPagination } from '../utils/infinity-pagination';
import { InfinityPaginationResponseDto } from '../utils/dto/infinity-pagination-response.dto';
import { CategoriesService } from '../categories/categories.service';
import { TicketResponseDto } from './dto/ticket-response.dto';

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
    private readonly notificationPreferenceService: NotificationPreferenceService,
    private readonly categoriesService: CategoriesService,
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
      closingNotes: null,
    });

    // Create history item for ticket creation
    await this.historyItemsService.create({
      ticketId: ticket.id,
      userId: userId,
      type: HistoryItemType.CREATED,
      details: 'Ticket created',
    });

    // 1) Notification: When a user opens a ticket, send them a notification
    if (await this.notificationPreferenceService.shouldSendNotification(userId, 'ticketCreated')) {
      await this.notificationsService.create({
        userId: userId,
        title: 'Ticket Created',
        message: `You have created a new ticket: "${ticket.title}"`,
        isRead: false,
        link: `/tickets/${ticket.id}`,
        linkLabel: 'View Ticket',
      });
    }

    // Send email notification for ticket creation
    const createdByUser = await this.usersService.findById(userId);
    if (createdByUser && createdByUser.email && 
        await this.notificationPreferenceService.shouldSendEmail(userId, 'ticketCreated')) {
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
          if (queueUser && queueUser.email && 
              await this.notificationPreferenceService.shouldSendEmail(assignedUserId, 'highPriorityAlert')) {
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
    user: JwtPayloadType,
    paginationOptions: IPaginationOptions,
    filters?: {
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: string;
      assignedToId?: string;
      createdById?: string;
      search?: string;
      userIds?: string[];
    },
  ): Promise<Ticket[]> {
    // Convert string priority to enum if it exists
    let formattedFilters: any = filters
      ? {
          ...filters,
          priority: filters.priority
            ? (filters.priority as TicketPriority) // Type assertion for valid enum values
            : undefined,
        }
      : {};

    // Apply role-based filtering
    // Convert role ID to number for comparison
    const userRoleId = Number(user.role?.id);
    
    if (userRoleId === RoleEnum.admin) {
      // Admins see all tickets - no additional filtering needed
      // They can use any filters passed in without restriction
      // formattedFilters stays exactly as provided
    } else if (userRoleId === RoleEnum.serviceDesk) {
      // Service Desk users see tickets in queues they are assigned to OR tickets they created
      const userQueues = await this.queuesService.findQueuesByUserId(user.id.toString());
      const queueIds = userQueues.map(queue => queue.id);
      
      // Apply service desk filter only if no specific filters are already applied
      if (!formattedFilters?.queueId && !formattedFilters?.createdById && !formattedFilters?.assignedToId) {
        // This will be handled in the repository to use $or condition
        formattedFilters = {
          ...formattedFilters,
          serviceDeskFilter: {
            queueIds,
            userId: user.id.toString(),
          },
        };
      }
      // If specific filters are applied, service desk users can use them without restriction
    } else {
      // Regular users only see tickets they created
      // Override any createdById filter to ensure they only see their own tickets
      formattedFilters = {
        ...formattedFilters,
        createdById: user.id.toString(),
      };
    }

    return this.ticketRepository.findAll(paginationOptions, formattedFilters);
  }

  async findAllPaginated(
    user: JwtPayloadType,
    paginationOptions: IPaginationOptions,
    filters?: {
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: string;
      assignedToId?: string;
      createdById?: string;
      search?: string;
      userIds?: string[];
    },
  ): Promise<InfinityPaginationResponseDto<TicketResponseDto>> {
    // Apply RBAC filters
    const formattedFilters = await this.applyRBACFilters(user, filters);
    
    // Get tickets and total count in parallel
    const [tickets, total] = await Promise.all([
      this.ticketRepository.findAll(paginationOptions, formattedFilters),
      this.ticketRepository.countAll(formattedFilters),
    ]);
    
    const enrichedTickets = await this.enrichTicketsWithRelations(tickets);
    return infinityPagination(enrichedTickets, paginationOptions, total);
  }

  private async enrichTicketsWithRelations(tickets: Ticket[]): Promise<TicketResponseDto[]> {
    // Get unique queue and category IDs
    const queueIds = [...new Set(tickets.map(t => t.queueId))];
    const categoryIds = [...new Set(tickets.map(t => t.categoryId))];

    // Fetch queues and categories in parallel
    const [queues, categories] = await Promise.all([
      Promise.all(queueIds.map(id => this.queuesService.findById(id).catch(() => null))),
      Promise.all(categoryIds.map(id => this.categoriesService.findById(id).catch(() => null))),
    ]);

    // Create maps for quick lookup
    const queueMap = new Map(queues.filter(q => q).map(q => [q!.id, q!]));
    const categoryMap = new Map(categories.filter(c => c).map(c => [c!.id, c!]));

    // Enrich tickets with queue and category names
    return tickets.map(ticket => {
      const queue = queueMap.get(ticket.queueId);
      const category = categoryMap.get(ticket.categoryId);
      
      return {
        ...ticket,
        queue: queue ? { id: queue.id, name: queue.name } : undefined,
        category: category ? { id: category.id, name: category.name } : undefined,
      } as TicketResponseDto;
    });
  }

  async findAllWithoutPagination(
    user: JwtPayloadType,
    filters?: {
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      createdById?: string;
      search?: string;
      userIds?: string[];
    }
  ): Promise<TicketResponseDto[]> {
    // Apply RBAC filters
    const filterQuery = await this.applyRBACFilters(user, filters);
    
    // Fetch all tickets without pagination
    const tickets = await this.ticketRepository.findAllWithoutPagination(filterQuery);
    
    // Enrich with relations
    return this.enrichTicketsWithRelations(tickets);
  }

  async getStatistics(
    user: JwtPayloadType,
    filters?: {
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      createdById?: string;
      search?: string;
      userIds?: string[];
    }
  ): Promise<{
    total: number;
    open: number;
    closed: number;
    byPriority: {
      high: number;
      medium: number;
      low: number;
    };
    byQueue: Array<{
      queueId: string;
      queueName: string;
      count: number;
    }>;
  }> {
    // Apply RBAC filters
    const filterQuery = await this.applyRBACFilters(user, filters);
    
    // Fetch all tickets for statistics
    const tickets = await this.ticketRepository.findAllWithoutPagination(filterQuery);
    
    // Calculate statistics
    const total = tickets.length;
    const open = tickets.filter(t => t.status === TicketStatus.OPENED).length;
    const closed = tickets.filter(t => t.status === TicketStatus.CLOSED).length;
    
    const byPriority = {
      high: tickets.filter(t => t.priority === TicketPriority.HIGH).length,
      medium: tickets.filter(t => t.priority === TicketPriority.MEDIUM).length,
      low: tickets.filter(t => t.priority === TicketPriority.LOW).length,
    };
    
    // Group by queue
    const queueGroups = new Map<string, number>();
    tickets.forEach(ticket => {
      const count = queueGroups.get(ticket.queueId) || 0;
      queueGroups.set(ticket.queueId, count + 1);
    });
    
    // Get queue names
    const byQueue = await Promise.all(
      Array.from(queueGroups.entries()).map(async ([queueId, count]) => {
        const queue = await this.queuesService.findById(queueId).catch(() => null);
        return {
          queueId,
          queueName: queue?.name || 'Unknown',
          count,
        };
      })
    );
    
    return {
      total,
      open,
      closed,
      byPriority,
      byQueue: byQueue.sort((a, b) => b.count - a.count),
    };
  }

  private async applyRBACFilters(
    user: JwtPayloadType,
    filters?: any
  ): Promise<any> {
    const userRoleId = Number(user.role?.id);
    
    // Admins see all tickets with no additional filters
    if (userRoleId === RoleEnum.admin) {
      return filters || {};
    }

    // Service desk users see tickets in their queues or tickets they created
    if (userRoleId === RoleEnum.serviceDesk) {
      const userQueues = await this.queuesService.findQueuesByUserId(user.id.toString());
      const queueIds = userQueues.map(queue => queue.id);
      
      return {
        ...filters,
        serviceDeskFilter: {
          queueIds,
          userId: user.id.toString(),
        },
      };
    }

    // Regular users only see tickets they created
    return {
      ...filters,
      createdById: user.id.toString(),
    };
  }

  async findById(id: string, user?: JwtPayloadType): Promise<Ticket> {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Apply access control
    if (user) {
      await this.checkTicketAccess(ticket, user);
    }

    return ticket;
  }

  private async checkTicketAccess(ticket: Ticket, user: JwtPayloadType): Promise<void> {
    // Convert role ID to number for comparison
    const userRoleId = Number(user.role?.id);
    
    // Admins can access all tickets
    if (userRoleId === RoleEnum.admin) {
      return;
    }

    // Service desk users can access tickets in their queues or tickets they created
    if (userRoleId === RoleEnum.serviceDesk) {
      if (ticket.createdById === user.id.toString()) {
        return; // User created this ticket
      }
      
      const userQueues = await this.queuesService.findQueuesByUserId(user.id.toString());
      const queueIds = userQueues.map(queue => queue.id);
      
      if (queueIds.includes(ticket.queueId)) {
        return; // Ticket is in user's assigned queue
      }
    }

    // Regular users can only access tickets they created
    if (userRoleId === RoleEnum.user && ticket.createdById === user.id.toString()) {
      return;
    }

    throw new ForbiddenException('You do not have permission to access this ticket');
  }

  async update(user: JwtPayloadType, id: string, updateTicketDto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.findById(id, user);
    const oldTicket = { ...ticket }; // Save old state to compare changes

    // Handle closing notes logic
    const updateData = { ...updateTicketDto };

    // If reopening a ticket, clear closing notes
    if (
      updateTicketDto.status === TicketStatus.OPENED &&
      oldTicket.status === TicketStatus.CLOSED
    ) {
      updateData.closingNotes = null;
    }

    // If closing a ticket and closingNotes are provided, add closedAt timestamp
    if (
      updateTicketDto.status === TicketStatus.CLOSED &&
      oldTicket.status !== TicketStatus.CLOSED
    ) {
      updateData.closedAt = new Date();
    }

    // If queue is being changed, unassign the ticket
    if (
      updateTicketDto.queueId &&
      updateTicketDto.queueId !== oldTicket.queueId
    ) {
      updateData.assignedToId = null;
    }

    const updatedTicket = await this.ticketRepository.update(id, updateData);
    if (!updatedTicket) {
      throw new NotFoundException('Ticket not found');
    }

    // Get user name for better history details
    const updaterUser = await this.usersService.findById(user.id.toString());
    const updaterName = updaterUser ? `${updaterUser.firstName} ${updaterUser.lastName}`.trim() || updaterUser.email : user.id.toString();

    // Handle direct assignment changes (not through queue changes)
    if (
      updateTicketDto.assignedToId !== undefined &&
      updateTicketDto.assignedToId !== oldTicket.assignedToId &&
      (!updateTicketDto.queueId || updateTicketDto.queueId === oldTicket.queueId)
    ) {
      if (updateTicketDto.assignedToId === null && oldTicket.assignedToId) {
        // Unassignment
        const oldAssigneeUser = await this.usersService.findById(oldTicket.assignedToId);
        const oldAssigneeName = oldAssigneeUser ? `${oldAssigneeUser.firstName} ${oldAssigneeUser.lastName}`.trim() || oldAssigneeUser.email : oldTicket.assignedToId;
        await this.historyItemsService.create({
          ticketId: id,
          userId: user.id.toString(),
          type: HistoryItemType.UNASSIGNED,
          details: `${updaterName} unassigned ${oldAssigneeName} from ticket`,
        });
      } else if (updateTicketDto.assignedToId && !oldTicket.assignedToId) {
        // New assignment
        const assigneeUser = await this.usersService.findById(updateTicketDto.assignedToId);
        const assigneeName = assigneeUser ? `${assigneeUser.firstName} ${assigneeUser.lastName}`.trim() || assigneeUser.email : updateTicketDto.assignedToId;
        await this.historyItemsService.create({
          ticketId: id,
          userId: user.id.toString(),
          type: HistoryItemType.ASSIGNED,
          details: `${updaterName} assigned ticket to ${assigneeName}`,
        });
      } else if (updateTicketDto.assignedToId && oldTicket.assignedToId) {
        // Reassignment
        const oldAssigneeUser = await this.usersService.findById(oldTicket.assignedToId);
        const assigneeUser = await this.usersService.findById(updateTicketDto.assignedToId);
        const oldAssigneeName = oldAssigneeUser ? `${oldAssigneeUser.firstName} ${oldAssigneeUser.lastName}`.trim() || oldAssigneeUser.email : oldTicket.assignedToId;
        const assigneeName = assigneeUser ? `${assigneeUser.firstName} ${assigneeUser.lastName}`.trim() || assigneeUser.email : updateTicketDto.assignedToId;
        await this.historyItemsService.create({
          ticketId: id,
          userId: user.id.toString(),
          type: HistoryItemType.ASSIGNED,
          details: `${updaterName} reassigned ticket from ${oldAssigneeName} to ${assigneeName}`,
        });
      }
    }

    // Handle notifications for queue, category and priority changes
    if (
      updateTicketDto.queueId &&
      updateTicketDto.queueId !== oldTicket.queueId
    ) {
      // Get queue names for better history details
      const oldQueue = await this.queuesService.findById(oldTicket.queueId);
      const newQueue = await this.queuesService.findById(updateTicketDto.queueId);
      const oldQueueName = oldQueue ? oldQueue.name : oldTicket.queueId;
      const newQueueName = newQueue ? newQueue.name : updateTicketDto.queueId;

      // Log queue change
      await this.historyItemsService.create({
        ticketId: id,
        userId: user.id.toString(),
        type: HistoryItemType.QUEUE_CHANGED,
        details: `${updaterName} changed queue from ${oldQueueName} to ${newQueueName}`,
      });

      // Log unassignment if ticket was previously assigned
      if (oldTicket.assignedToId) {
        const oldAssigneeUser = await this.usersService.findById(oldTicket.assignedToId);
        const oldAssigneeName = oldAssigneeUser ? `${oldAssigneeUser.firstName} ${oldAssigneeUser.lastName}`.trim() || oldAssigneeUser.email : oldTicket.assignedToId;
        await this.historyItemsService.create({
          ticketId: id,
          userId: user.id.toString(),
          type: HistoryItemType.UNASSIGNED,
          details: `${updaterName} unassigned ${oldAssigneeName} due to queue change`,
        });
      }
    }

    if (
      updateTicketDto.categoryId &&
      updateTicketDto.categoryId !== oldTicket.categoryId
    ) {
      // Get category names for better history details
      const oldCategory = await this.categoriesService.findById(oldTicket.categoryId);
      const newCategory = await this.categoriesService.findById(updateTicketDto.categoryId);
      const oldCategoryName = oldCategory ? oldCategory.name : oldTicket.categoryId;
      const newCategoryName = newCategory ? newCategory.name : updateTicketDto.categoryId;

      await this.historyItemsService.create({
        ticketId: id,
        userId: user.id.toString(),
        type: HistoryItemType.CATEGORY_CHANGED,
        details: `${updaterName} changed category from ${oldCategoryName} to ${newCategoryName}`,
      });
    }

    // Handle status changes
    if (
      updateTicketDto.status &&
      updateTicketDto.status !== oldTicket.status
    ) {
      let historyType = HistoryItemType.STATUS_CHANGED;
      let historyDetails = `${updaterName} changed status from ${oldTicket.status} to ${updateTicketDto.status}`;
      
      // Use specific history types for closed/reopened
      if (updateTicketDto.status === TicketStatus.CLOSED) {
        historyType = HistoryItemType.CLOSED;
        historyDetails = `${updaterName} closed ticket`;
      } else if (updateTicketDto.status === TicketStatus.OPENED && 
                 (oldTicket.status === TicketStatus.CLOSED || oldTicket.status === TicketStatus.RESOLVED)) {
        historyType = HistoryItemType.REOPENED;
        historyDetails = `${updaterName} reopened ticket`;
      } else if (updateTicketDto.status === TicketStatus.RESOLVED) {
        historyDetails = `${updaterName} resolved ticket`;
      }
      
      await this.historyItemsService.create({
        ticketId: id,
        userId: user.id.toString(),
        type: historyType,
        details: historyDetails,
      });

      // Create separate history item for closing notes if provided
      if (updateTicketDto.closingNotes && updateTicketDto.closingNotes.trim()) {
        await this.historyItemsService.create({
          ticketId: id,
          userId: user.id.toString(),
          type: HistoryItemType.COMMENT,
          details: updateTicketDto.closingNotes.trim(),
        });
      }
    }

    if (
      updateTicketDto.priority &&
      updateTicketDto.priority !== oldTicket.priority
    ) {
      await this.historyItemsService.create({
        ticketId: id,
        userId: user.id.toString(),
        type: HistoryItemType.PRIORITY_CHANGED,
        details: `${updaterName} changed priority from ${oldTicket.priority} to ${updateTicketDto.priority}`,
      });

      // Send email notification for priority change
      const ticketCreator = await this.usersService.findById(
        updatedTicket.createdById,
      );
      if (ticketCreator && ticketCreator.email && 
          await this.notificationPreferenceService.shouldSendEmail(updatedTicket.createdById, 'priorityChanged')) {
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
            if (queueUser && queueUser.email && 
                await this.notificationPreferenceService.shouldSendEmail(assignedUserId, 'highPriorityAlert')) {
              await this.mailService.highPriorityTicketAlert({
                to: queueUser.email,
                data: {
                  ticket: updatedTicket,
                  submittedBy:
                    ticketCreator?.email || updatedTicket.createdById,
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
    user: JwtPayloadType,
    ticketId: string,
    assigneeId: string,
  ): Promise<Ticket> {
    const ticket = await this.findById(ticketId, user);
    const oldAssigneeId = ticket.assignedToId;
    
    // Prepare update data
    const updateData: any = {
      assignedToId: assigneeId,
    };
    
    // Automatically set status to IN_PROGRESS when assigning
    if (assigneeId && ticket.status === TicketStatus.OPENED) {
      updateData.status = TicketStatus.IN_PROGRESS;
    }
    
    const updated = await this.ticketRepository.update(ticketId, updateData);
    if (!updated) {
      throw new NotFoundException('Ticket not found');
    }

    // Get user names for better history details
    const assignerUser = await this.usersService.findById(user.id.toString());
    const assigneeUser = await this.usersService.findById(assigneeId);
    const assignerName = assignerUser ? `${assignerUser.firstName} ${assignerUser.lastName}`.trim() || assignerUser.email : user.id.toString();
    const assigneeName = assigneeUser ? `${assigneeUser.firstName} ${assigneeUser.lastName}`.trim() || assigneeUser.email : assigneeId;
    
    let historyDetails = '';
    if (oldAssigneeId) {
      const oldAssigneeUser = await this.usersService.findById(oldAssigneeId);
      const oldAssigneeName = oldAssigneeUser ? `${oldAssigneeUser.firstName} ${oldAssigneeUser.lastName}`.trim() || oldAssigneeUser.email : oldAssigneeId;
      historyDetails = `${assignerName} reassigned ticket from ${oldAssigneeName} to ${assigneeName}`;
    } else {
      historyDetails = `${assignerName} assigned ticket to ${assigneeName}`;
    }

    // Create history item for assignment
    await this.historyItemsService.create({
      ticketId,
      userId: user.id.toString(),
      type: HistoryItemType.ASSIGNED,
      details: historyDetails,
    });
    
    // Create history item for status change if status was changed
    if (assigneeId && ticket.status === TicketStatus.OPENED) {
      await this.historyItemsService.create({
        ticketId,
        userId: user.id.toString(),
        type: HistoryItemType.STATUS_CHANGED,
        details: `${assignerName} changed status from ${TicketStatus.OPENED} to ${TicketStatus.IN_PROGRESS}`,
      });
    }

    // 2) Notification: When a user is assigned to a ticket, notify them
    if (await this.notificationPreferenceService.shouldSendNotification(assigneeId, 'ticketAssigned')) {
      await this.notificationsService.create({
        userId: assigneeId,
        title: 'Ticket Assigned',
        message: `You have been assigned to ticket: "${ticket.title}"`,
        isRead: false,
        link: `/tickets/${ticket.id}`,
        linkLabel: 'View Ticket',
      });
    }

    // Send email to ticket creator about assignment
    const ticketCreator = await this.usersService.findById(updated.createdById);
    const assignedUser = await this.usersService.findById(assigneeId);

    if (ticketCreator && assignedUser && ticketCreator.email && 
        await this.notificationPreferenceService.shouldSendEmail(updated.createdById, 'ticketAssigned')) {
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
    user: JwtPayloadType,
    ticketId: string,
    status: TicketStatus,
    closingNotes?: string,
  ): Promise<Ticket> {
    const ticket = await this.findById(ticketId, user);
    const oldStatus = ticket.status;

    if (ticket.status === status) {
      return ticket; // No change needed
    }

    const updateData: any = { status };

    // Handle closing notes logic for both CLOSED and RESOLVED statuses
    if ((status === TicketStatus.CLOSED || status === TicketStatus.RESOLVED) && 
        oldStatus !== TicketStatus.CLOSED && oldStatus !== TicketStatus.RESOLVED) {
      updateData.closedAt = new Date();
      if (closingNotes) {
        updateData.closingNotes = closingNotes;
      }
    } else if (
      (status === TicketStatus.OPENED || status === TicketStatus.IN_PROGRESS) &&
      (oldStatus === TicketStatus.CLOSED || oldStatus === TicketStatus.RESOLVED)
    ) {
      // Clear closing notes when reopening
      updateData.closingNotes = null;
      updateData.closedAt = null;
    }

    const updated = await this.ticketRepository.update(ticketId, updateData);
    if (!updated) {
      throw new NotFoundException('Ticket not found');
    }

    // Get user name for better history details
    const statusChangerUser = await this.usersService.findById(user.id.toString());
    const statusChangerName = statusChangerUser ? `${statusChangerUser.firstName} ${statusChangerUser.lastName}`.trim() || statusChangerUser.email : user.id.toString();

    // Create history item for status change
    let historyType = HistoryItemType.STATUS_CHANGED;
    let historyDetails = `${statusChangerName} changed status from ${oldStatus} to ${status}`;
    
    // Use specific history types for closed/reopened
    if (status === TicketStatus.CLOSED) {
      historyType = HistoryItemType.CLOSED;
      historyDetails = `${statusChangerName} closed ticket`;
    } else if (status === TicketStatus.OPENED && 
               (oldStatus === TicketStatus.CLOSED || oldStatus === TicketStatus.RESOLVED)) {
      historyType = HistoryItemType.REOPENED;
      historyDetails = `${statusChangerName} reopened ticket`;
    } else if (status === TicketStatus.RESOLVED) {
      historyDetails = `${statusChangerName} resolved ticket`;
    }
    
    await this.historyItemsService.create({
      ticketId,
      userId: user.id.toString(),
      type: historyType,
      details: historyDetails,
    });

    // Create separate history item for closing notes if provided
    if (closingNotes && closingNotes.trim()) {
      await this.historyItemsService.create({
        ticketId,
        userId: user.id.toString(),
        type: HistoryItemType.COMMENT,
        details: closingNotes.trim(),
      });
    }

    // 3) Notification: When a ticket a user opens is closed or reopened, notify them
    const eventType = status === TicketStatus.CLOSED ? 'ticketClosed' : 'ticketReopened';
    if (ticket.createdById && ticket.createdById !== user.id.toString() && 
        await this.notificationPreferenceService.shouldSendNotification(ticket.createdById, eventType)) {
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
      ticket.assignedToId !== user.id.toString() &&
      ticket.assignedToId !== ticket.createdById &&
      await this.notificationPreferenceService.shouldSendNotification(ticket.assignedToId, eventType)
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
        [TicketStatus.IN_PROGRESS]: 'In Progress',
        [TicketStatus.RESOLVED]: 'Resolved',
        [TicketStatus.CLOSED]: 'Closed',
      };

      // Special handling for resolved status
      if (status === TicketStatus.RESOLVED && 
          await this.notificationPreferenceService.shouldSendEmail(updated.createdById, 'ticketResolved')) {
        await this.mailService.ticketResolved({
          to: ticketCreator.email,
          data: {
            ticket: updated,
            userName: ticketCreator.firstName || 'User',
            resolutionSummary:
              closingNotes || 'Your issue has been resolved by our support team.',
          },
        });
      }

      // Always send status change email
      if (await this.notificationPreferenceService.shouldSendEmail(updated.createdById, 'ticketStatusChanged')) {
        await this.mailService.ticketStatusChanged({
          to: ticketCreator.email,
          data: {
            ticket: updated,
            oldStatus: statusMap[oldStatus],
            newStatus: statusMap[status],
            userName: ticketCreator.firstName || 'User',
          },
        });
      }

      // Send specific closed email if closing
      if (status === TicketStatus.CLOSED && 
          await this.notificationPreferenceService.shouldSendEmail(updated.createdById, 'ticketClosed')) {
        await this.mailService.ticketClosed({
          to: ticketCreator.email,
          data: {
            ticket: updated,
            userName: ticketCreator.firstName || 'User',
            closingNotes: updated.closingNotes || undefined,
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
    // Convert role ID to number for comparison
    const userRoleId = Number(user.role?.id);
    // Only admins or the creator can delete tickets
    if (userRoleId !== RoleEnum.admin && user.id !== ticket.createdById) {
      throw new ForbiddenException(
        'You do not have permission to delete this ticket',
      );
    }

    // Notify assignee if the ticket is being deleted and they're not the one deleting it
    if (ticket.assignedToId && ticket.assignedToId !== user.id && 
        await this.notificationPreferenceService.shouldSendNotification(ticket.assignedToId, 'ticketDeleted')) {
      await this.notificationsService.create({
        userId: ticket.assignedToId,
        title: 'Ticket Deleted',
        message: `Ticket "${ticket.title}" that was assigned to you has been deleted.`,
        isRead: false,
      });
    }

    // Notify creator if the ticket is being deleted by admin and not by themselves
    if (ticket.createdById !== user.id && 
        await this.notificationPreferenceService.shouldSendNotification(ticket.createdById, 'ticketDeleted')) {
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
