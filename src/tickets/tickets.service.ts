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
    if (
      await this.notificationPreferenceService.shouldSendNotification(
        userId,
        'ticketCreated',
      )
    ) {
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
    if (
      createdByUser &&
      createdByUser.email &&
      (await this.notificationPreferenceService.shouldSendEmail(
        userId,
        'ticketCreated',
      ))
    ) {
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
          if (
            queueUser &&
            queueUser.email &&
            (await this.notificationPreferenceService.shouldSendEmail(
              assignedUserId,
              'highPriorityAlert',
            ))
          ) {
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
      const userQueues = await this.queuesService.findQueuesByUserId(
        user.id.toString(),
      );
      const queueIds = userQueues.map((queue) => queue.id);

      // Apply service desk filter only if no specific filters are already applied
      if (
        !formattedFilters?.queueId &&
        !formattedFilters?.createdById &&
        !formattedFilters?.assignedToId
      ) {
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
      // New comprehensive filters
      search?: string;
      queueIds?: string[];
      categoryIds?: string[];
      statuses?: TicketStatus[];
      priorities?: TicketPriority[];
      assignedToUserIds?: string[];
      createdByUserIds?: string[];
      unassigned?: boolean;
      createdAfter?: string;
      createdBefore?: string;
      updatedAfter?: string;
      updatedBefore?: string;
      closedAfter?: string;
      closedBefore?: string;
      hasDocuments?: boolean;
      hasComments?: boolean;
      includeArchived?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';

      // Legacy support (will be normalized)
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      createdById?: string;
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

  private async enrichTicketsWithRelations(
    tickets: Ticket[],
  ): Promise<TicketResponseDto[]> {
    // Get unique IDs
    const queueIds = [...new Set(tickets.map((t) => t.queueId))];
    const categoryIds = [...new Set(tickets.map((t) => t.categoryId))];
    const userIds = [
      ...new Set([
        ...tickets.map((t) => t.createdById).filter(Boolean),
        ...tickets.map((t) => t.assignedToId).filter(Boolean),
      ]),
    ].filter((id): id is string => typeof id === 'string');

    // Fetch all related data in parallel
    const [queues, categories, users] = await Promise.all([
      Promise.all(
        queueIds.map((id) => this.queuesService.findById(id).catch(() => null)),
      ),
      Promise.all(
        categoryIds.map((id) =>
          this.categoriesService.findById(id).catch(() => null),
        ),
      ),
      Promise.all(
        userIds.map((id) => this.usersService.findById(id).catch(() => null)),
      ),
    ]);

    // Create maps for quick lookup
    const queueMap = new Map(queues.filter((q) => q).map((q) => [q!.id, q!]));
    const categoryMap = new Map(
      categories.filter((c) => c).map((c) => [c!.id, c!]),
    );
    const userMap = new Map(users.filter((u) => u).map((u) => [u!.id, u!]));

    // Enrich tickets with all relations
    return tickets.map((ticket) => {
      const queue = queueMap.get(ticket.queueId);
      const category = categoryMap.get(ticket.categoryId);
      const createdByUser = userMap.get(ticket.createdById);
      const assignedToUser = ticket.assignedToId
        ? userMap.get(ticket.assignedToId)
        : undefined;

      return {
        ...ticket,
        queue: queue ? { id: queue.id, name: queue.name } : undefined,
        category: category
          ? { id: category.id, name: category.name }
          : undefined,
        createdBy: createdByUser
          ? {
              id: createdByUser.id,
              firstName: createdByUser.firstName,
              lastName: createdByUser.lastName,
              email: createdByUser.email,
            }
          : undefined,
        assignedTo: assignedToUser
          ? {
              id: assignedToUser.id,
              firstName: assignedToUser.firstName,
              lastName: assignedToUser.lastName,
              email: assignedToUser.email,
            }
          : undefined,
      } as TicketResponseDto;
    });
  }

  async findAllWithoutPagination(
    user: JwtPayloadType,
    filters?: {
      // New comprehensive filters
      search?: string;
      queueIds?: string[];
      categoryIds?: string[];
      statuses?: TicketStatus[];
      priorities?: TicketPriority[];
      assignedToUserIds?: string[];
      createdByUserIds?: string[];
      unassigned?: boolean;
      createdAfter?: string;
      createdBefore?: string;
      updatedAfter?: string;
      updatedBefore?: string;
      closedAfter?: string;
      closedBefore?: string;
      hasDocuments?: boolean;
      hasComments?: boolean;
      includeArchived?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';

      // Legacy support (will be normalized)
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      createdById?: string;
      userIds?: string[];
    },
  ): Promise<TicketResponseDto[]> {
    // Apply RBAC filters
    const filterQuery = await this.applyRBACFilters(user, filters);

    // Fetch all tickets without pagination
    const tickets =
      await this.ticketRepository.findAllWithoutPagination(filterQuery);

    // Enrich with relations
    return this.enrichTicketsWithRelations(tickets);
  }

  async getStatistics(
    user: JwtPayloadType,
    filters?: {
      // New comprehensive filters
      search?: string;
      queueIds?: string[];
      categoryIds?: string[];
      statuses?: TicketStatus[];
      priorities?: TicketPriority[];
      assignedToUserIds?: string[];
      createdByUserIds?: string[];
      unassigned?: boolean;
      createdAfter?: string;
      createdBefore?: string;
      updatedAfter?: string;
      updatedBefore?: string;
      closedAfter?: string;
      closedBefore?: string;
      hasDocuments?: boolean;
      hasComments?: boolean;
      includeArchived?: boolean;

      // Legacy support (will be normalized)
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      createdById?: string;
      userIds?: string[];
    },
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
    const tickets =
      await this.ticketRepository.findAllWithoutPagination(filterQuery);

    // Calculate statistics
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === TicketStatus.OPENED).length;
    const closed = tickets.filter(
      (t) => t.status === TicketStatus.CLOSED,
    ).length;

    const byPriority = {
      high: tickets.filter((t) => t.priority === TicketPriority.HIGH).length,
      medium: tickets.filter((t) => t.priority === TicketPriority.MEDIUM)
        .length,
      low: tickets.filter((t) => t.priority === TicketPriority.LOW).length,
    };

    // Group by queue
    const queueGroups = new Map<string, number>();
    tickets.forEach((ticket) => {
      const count = queueGroups.get(ticket.queueId) || 0;
      queueGroups.set(ticket.queueId, count + 1);
    });

    // Get queue names
    const byQueue = await Promise.all(
      Array.from(queueGroups.entries()).map(async ([queueId, count]) => {
        const queue = await this.queuesService
          .findById(queueId)
          .catch(() => null);
        return {
          queueId,
          queueName: queue?.name || 'Unknown',
          count,
        };
      }),
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
    filters?: any,
  ): Promise<any> {
    const userRoleId = Number(user.role?.id);
    const processedFilters = { ...filters };

    // Handle backward compatibility by converting legacy params to new format
    this.normalizeFilters(processedFilters);

    // Process unassigned filter for all users
    if (processedFilters.unassigned === true) {
      // For unassigned filter, we need to modify the assignedToUserIds
      processedFilters.assignedToUserIds = null;
      delete processedFilters.unassigned;
    }

    // Admins see all tickets with no additional filters
    if (userRoleId === RoleEnum.admin) {
      return processedFilters;
    }

    // Service desk users see tickets in their queues or tickets they created
    if (userRoleId === RoleEnum.serviceDesk) {
      const userQueues = await this.queuesService.findQueuesByUserId(
        user.id.toString(),
      );
      const queueIds = userQueues.map((queue) => queue.id);

      return {
        ...processedFilters,
        serviceDeskFilter: {
          queueIds,
          userId: user.id.toString(),
        },
      };
    }

    // Regular users only see tickets they created
    // If they specified createdByUserIds, ensure they can only see their own
    if (processedFilters.createdByUserIds) {
      // Filter to only include the current user
      processedFilters.createdByUserIds =
        processedFilters.createdByUserIds.filter(
          (id: string) => id === user.id.toString(),
        );
      // If no valid IDs remain, set to current user
      if (processedFilters.createdByUserIds.length === 0) {
        processedFilters.createdByUserIds = [user.id.toString()];
      }
    } else {
      // Default to only current user's tickets
      processedFilters.createdByUserIds = [user.id.toString()];
    }

    // Regular users cannot see tickets assigned to others unless they created them
    // So we remove assignedToUserIds filter for regular users
    delete processedFilters.assignedToUserIds;

    return processedFilters;
  }

  /**
   * Normalizes legacy filter parameters to new array-based format
   * Provides backward compatibility for existing API consumers
   */
  private normalizeFilters(filters: any): void {
    // Convert single queue to array
    if (filters.queueId && !filters.queueIds) {
      filters.queueIds = [filters.queueId];
      delete filters.queueId;
    }

    // Convert single category to array
    if (filters.categoryId && !filters.categoryIds) {
      filters.categoryIds = [filters.categoryId];
      delete filters.categoryId;
    }

    // Convert single status to array
    if (filters.status && !filters.statuses) {
      filters.statuses = [filters.status];
      delete filters.status;
    }

    // Convert single priority to array
    if (filters.priority && !filters.priorities) {
      filters.priorities = [filters.priority];
      delete filters.priority;
    }

    // Convert legacy user filters
    if (filters.assignedToId && !filters.assignedToUserIds) {
      filters.assignedToUserIds = [filters.assignedToId];
      delete filters.assignedToId;
    }

    if (filters.createdById && !filters.createdByUserIds) {
      filters.createdByUserIds = [filters.createdById];
      delete filters.createdById;
    }

    // Handle legacy userIds parameter
    if (filters.userIds && filters.userIds.length > 0) {
      // For backward compatibility, treat userIds as assignedToUserIds
      // This matches the previous behavior
      if (!filters.assignedToUserIds) {
        filters.assignedToUserIds = filters.userIds;
      }
      delete filters.userIds;
    }
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

  private async checkTicketAccess(
    ticket: Ticket,
    user: JwtPayloadType,
  ): Promise<void> {
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

      const userQueues = await this.queuesService.findQueuesByUserId(
        user.id.toString(),
      );
      const queueIds = userQueues.map((queue) => queue.id);

      if (queueIds.includes(ticket.queueId)) {
        return; // Ticket is in user's assigned queue
      }
    }

    // Regular users can only access tickets they created
    if (
      userRoleId === RoleEnum.user &&
      ticket.createdById === user.id.toString()
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to access this ticket',
    );
  }

  async update(
    user: JwtPayloadType,
    id: string,
    updateTicketDto: UpdateTicketDto,
  ): Promise<Ticket> {
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
    const updaterName = updaterUser
      ? `${updaterUser.firstName} ${updaterUser.lastName}`.trim() ||
        updaterUser.email
      : user.id.toString();

    // Handle direct assignment changes (not through queue changes)
    if (
      updateTicketDto.assignedToId !== undefined &&
      updateTicketDto.assignedToId !== oldTicket.assignedToId &&
      (!updateTicketDto.queueId ||
        updateTicketDto.queueId === oldTicket.queueId)
    ) {
      if (updateTicketDto.assignedToId === null && oldTicket.assignedToId) {
        // Unassignment
        const oldAssigneeUser = await this.usersService.findById(
          oldTicket.assignedToId,
        );
        const oldAssigneeName = oldAssigneeUser
          ? `${oldAssigneeUser.firstName} ${oldAssigneeUser.lastName}`.trim() ||
            oldAssigneeUser.email
          : oldTicket.assignedToId;
        await this.historyItemsService.create({
          ticketId: id,
          userId: user.id.toString(),
          type: HistoryItemType.UNASSIGNED,
          details: `${updaterName} unassigned ${oldAssigneeName} from ticket`,
        });
      } else if (updateTicketDto.assignedToId && !oldTicket.assignedToId) {
        // New assignment
        const assigneeUser = await this.usersService.findById(
          updateTicketDto.assignedToId,
        );
        const assigneeName = assigneeUser
          ? `${assigneeUser.firstName} ${assigneeUser.lastName}`.trim() ||
            assigneeUser.email
          : updateTicketDto.assignedToId;
        await this.historyItemsService.create({
          ticketId: id,
          userId: user.id.toString(),
          type: HistoryItemType.ASSIGNED,
          details: `${updaterName} assigned ticket to ${assigneeName}`,
        });
      } else if (updateTicketDto.assignedToId && oldTicket.assignedToId) {
        // Reassignment
        const oldAssigneeUser = await this.usersService.findById(
          oldTicket.assignedToId,
        );
        const assigneeUser = await this.usersService.findById(
          updateTicketDto.assignedToId,
        );
        const oldAssigneeName = oldAssigneeUser
          ? `${oldAssigneeUser.firstName} ${oldAssigneeUser.lastName}`.trim() ||
            oldAssigneeUser.email
          : oldTicket.assignedToId;
        const assigneeName = assigneeUser
          ? `${assigneeUser.firstName} ${assigneeUser.lastName}`.trim() ||
            assigneeUser.email
          : updateTicketDto.assignedToId;
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
      const newQueue = await this.queuesService.findById(
        updateTicketDto.queueId,
      );
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
        const oldAssigneeUser = await this.usersService.findById(
          oldTicket.assignedToId,
        );
        const oldAssigneeName = oldAssigneeUser
          ? `${oldAssigneeUser.firstName} ${oldAssigneeUser.lastName}`.trim() ||
            oldAssigneeUser.email
          : oldTicket.assignedToId;
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
      const oldCategory = await this.categoriesService.findById(
        oldTicket.categoryId,
      );
      const newCategory = await this.categoriesService.findById(
        updateTicketDto.categoryId,
      );
      const oldCategoryName = oldCategory
        ? oldCategory.name
        : oldTicket.categoryId;
      const newCategoryName = newCategory
        ? newCategory.name
        : updateTicketDto.categoryId;

      await this.historyItemsService.create({
        ticketId: id,
        userId: user.id.toString(),
        type: HistoryItemType.CATEGORY_CHANGED,
        details: `${updaterName} changed category from ${oldCategoryName} to ${newCategoryName}`,
      });
    }

    // Handle status changes
    if (updateTicketDto.status && updateTicketDto.status !== oldTicket.status) {
      let historyType = HistoryItemType.STATUS_CHANGED;
      let historyDetails = `${updaterName} changed status from ${oldTicket.status} to ${updateTicketDto.status}`;

      // Use specific history types for closed/reopened
      if (updateTicketDto.status === TicketStatus.CLOSED) {
        historyType = HistoryItemType.CLOSED;
        historyDetails = `${updaterName} closed ticket`;
      } else if (
        updateTicketDto.status === TicketStatus.OPENED &&
        (oldTicket.status === TicketStatus.CLOSED ||
          oldTicket.status === TicketStatus.RESOLVED)
      ) {
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
      if (
        ticketCreator &&
        ticketCreator.email &&
        (await this.notificationPreferenceService.shouldSendEmail(
          updatedTicket.createdById,
          'priorityChanged',
        ))
      ) {
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
            if (
              queueUser &&
              queueUser.email &&
              (await this.notificationPreferenceService.shouldSendEmail(
                assignedUserId,
                'highPriorityAlert',
              ))
            ) {
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
    const assignerName = assignerUser
      ? `${assignerUser.firstName} ${assignerUser.lastName}`.trim() ||
        assignerUser.email
      : user.id.toString();
    const assigneeName = assigneeUser
      ? `${assigneeUser.firstName} ${assigneeUser.lastName}`.trim() ||
        assigneeUser.email
      : assigneeId;

    let historyDetails = '';
    if (oldAssigneeId) {
      const oldAssigneeUser = await this.usersService.findById(oldAssigneeId);
      const oldAssigneeName = oldAssigneeUser
        ? `${oldAssigneeUser.firstName} ${oldAssigneeUser.lastName}`.trim() ||
          oldAssigneeUser.email
        : oldAssigneeId;
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
    if (
      await this.notificationPreferenceService.shouldSendNotification(
        assigneeId,
        'ticketAssigned',
      )
    ) {
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

    if (
      ticketCreator &&
      assignedUser &&
      ticketCreator.email &&
      (await this.notificationPreferenceService.shouldSendEmail(
        updated.createdById,
        'ticketAssigned',
      ))
    ) {
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
    if (
      (status === TicketStatus.CLOSED || status === TicketStatus.RESOLVED) &&
      oldStatus !== TicketStatus.CLOSED &&
      oldStatus !== TicketStatus.RESOLVED
    ) {
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
    const statusChangerUser = await this.usersService.findById(
      user.id.toString(),
    );
    const statusChangerName = statusChangerUser
      ? `${statusChangerUser.firstName} ${statusChangerUser.lastName}`.trim() ||
        statusChangerUser.email
      : user.id.toString();

    // Create history item for status change
    let historyType = HistoryItemType.STATUS_CHANGED;
    let historyDetails = `${statusChangerName} changed status from ${oldStatus} to ${status}`;

    // Use specific history types for closed/reopened
    if (status === TicketStatus.CLOSED) {
      historyType = HistoryItemType.CLOSED;
      historyDetails = `${statusChangerName} closed ticket`;
    } else if (
      status === TicketStatus.OPENED &&
      (oldStatus === TicketStatus.CLOSED || oldStatus === TicketStatus.RESOLVED)
    ) {
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
    const eventType =
      status === TicketStatus.CLOSED ? 'ticketClosed' : 'ticketReopened';
    if (
      ticket.createdById &&
      ticket.createdById !== user.id.toString() &&
      (await this.notificationPreferenceService.shouldSendNotification(
        ticket.createdById,
        eventType,
      ))
    ) {
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
      (await this.notificationPreferenceService.shouldSendNotification(
        ticket.assignedToId,
        eventType,
      ))
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
      if (
        status === TicketStatus.RESOLVED &&
        (await this.notificationPreferenceService.shouldSendEmail(
          updated.createdById,
          'ticketResolved',
        ))
      ) {
        await this.mailService.ticketResolved({
          to: ticketCreator.email,
          data: {
            ticket: updated,
            userName: ticketCreator.firstName || 'User',
            resolutionSummary:
              closingNotes ||
              'Your issue has been resolved by our support team.',
          },
        });
      }

      // Always send status change email
      if (
        await this.notificationPreferenceService.shouldSendEmail(
          updated.createdById,
          'ticketStatusChanged',
        )
      ) {
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
      if (
        status === TicketStatus.CLOSED &&
        (await this.notificationPreferenceService.shouldSendEmail(
          updated.createdById,
          'ticketClosed',
        ))
      ) {
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
    if (
      ticket.assignedToId &&
      ticket.assignedToId !== user.id &&
      (await this.notificationPreferenceService.shouldSendNotification(
        ticket.assignedToId,
        'ticketDeleted',
      ))
    ) {
      await this.notificationsService.create({
        userId: ticket.assignedToId,
        title: 'Ticket Deleted',
        message: `Ticket "${ticket.title}" that was assigned to you has been deleted.`,
        isRead: false,
      });
    }

    // Notify creator if the ticket is being deleted by admin and not by themselves
    if (
      ticket.createdById !== user.id &&
      (await this.notificationPreferenceService.shouldSendNotification(
        ticket.createdById,
        'ticketDeleted',
      ))
    ) {
      await this.notificationsService.create({
        userId: ticket.createdById,
        title: 'Your Ticket Deleted',
        message: `Your ticket "${ticket.title}" has been deleted.`,
        isRead: false,
      });
    }

    await this.ticketRepository.remove(id);
  }

  // Batch operations for performance optimization
  async batchUpdateTickets(
    user: JwtPayloadType,
    updates: Array<{
      id: string;
      status?: TicketStatus;
      assignedToId?: string | null;
      closingNotes?: string;
    }>,
  ): Promise<Ticket[]> {
    // Validate user has access to all tickets first
    const tickets = await Promise.all(
      updates.map((update) => this.findById(update.id, user)),
    );

    // Perform all updates in parallel
    const updatedTickets = await Promise.all(
      updates.map(async (update, index) => {
        const ticket = tickets[index];
        const updateData: any = {};

        if (update.status !== undefined) {
          updateData.status = update.status;

          // Auto-set closedAt for closed tickets
          if (update.status === TicketStatus.CLOSED && !ticket.closedAt) {
            updateData.closedAt = new Date();
          }

          // Clear closedAt if reopening
          if (update.status !== TicketStatus.CLOSED && ticket.closedAt) {
            updateData.closedAt = null;
          }
        }

        if (update.assignedToId !== undefined) {
          updateData.assignedToId = update.assignedToId;

          // Auto-set to IN_PROGRESS when assigning (unless already resolved/closed)
          if (update.assignedToId && ticket.status === TicketStatus.OPENED) {
            updateData.status = TicketStatus.IN_PROGRESS;
          }
        }

        const updated = await this.ticketRepository.update(
          ticket.id,
          updateData,
        );

        // Add to history with batch context
        await this.historyItemsService.create({
          ticketId: ticket.id,
          userId: user.id.toString(),
          type: update.status
            ? HistoryItemType.STATUS_CHANGED
            : HistoryItemType.ASSIGNED,
          details: `Batch update: ${JSON.stringify(update)}`,
        });

        return updated;
      }),
    );

    return updatedTickets.filter((ticket): ticket is Ticket => ticket !== null);
  }

  async batchAssignTickets(
    user: JwtPayloadType,
    ticketIds: string[],
    assigneeId: string,
  ): Promise<Ticket[]> {
    // Validate user has access to all tickets first
    const tickets = await Promise.all(
      ticketIds.map((id) => this.findById(id, user)),
    );

    // Perform all assignments in parallel
    const assignedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        const updateData: any = {
          assignedToId: assigneeId,
        };

        // Auto-set to IN_PROGRESS when assigning (unless already resolved/closed)
        if (ticket.status === TicketStatus.OPENED) {
          updateData.status = TicketStatus.IN_PROGRESS;
        }

        const updated = await this.ticketRepository.update(
          ticket.id,
          updateData,
        );

        // Add to history
        await this.historyItemsService.create({
          ticketId: ticket.id,
          userId: user.id.toString(),
          type: HistoryItemType.ASSIGNED,
          details: `Batch assigned to user ${assigneeId}`,
        });

        // Send notification to assignee
        if (
          await this.notificationPreferenceService.shouldSendNotification(
            assigneeId,
            'ticketAssigned',
          )
        ) {
          await this.notificationsService.create({
            userId: assigneeId,
            title: 'New Ticket Assigned',
            message: `You have been assigned to ticket "${ticket.title}" (batch operation).`,
            isRead: false,
          });
        }

        return updated;
      }),
    );

    return assignedTickets.filter(
      (ticket): ticket is Ticket => ticket !== null,
    );
  }

  async getResolutionTimeAnalytics(
    user: JwtPayloadType,
    filters?: {
      createdAfter?: string;
      createdBefore?: string;
      closedAfter?: string;
      closedBefore?: string;
      queueIds?: string[];
      categoryIds?: string[];
      priorities?: TicketPriority[];
      assignedToUserIds?: string[];
    },
  ) {
    // Apply RBAC filters
    const formattedFilters = await this.applyRBACFilters(user, {
      ...filters,
      statuses: [TicketStatus.CLOSED], // Only analyze closed tickets
    });

    const tickets = await this.ticketRepository.findAll(
      { page: 1, limit: 100000 }, // Get all matching tickets
      formattedFilters,
    );

    const resolvedTickets = tickets.filter((t) => t.closedAt);

    if (resolvedTickets.length === 0) {
      return {
        overall: {
          averageResolutionTimeHours: 0,
          medianResolutionTimeHours: 0,
          totalTicketsResolved: 0,
        },
        byPriority: { high: null, medium: null, low: null },
        byQueue: [],
        byUser: [],
      };
    }

    // Calculate resolution times in hours
    const resolutionTimes = resolvedTickets.map((ticket) => {
      const created = new Date(ticket.createdAt);
      const closed = new Date(ticket.closedAt!);
      return (closed.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
    });

    // Overall statistics
    const averageResolutionTimeHours =
      resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
    const sortedTimes = resolutionTimes.sort((a, b) => a - b);
    const medianResolutionTimeHours =
      sortedTimes[Math.floor(sortedTimes.length / 2)];

    // By priority
    const byPriority = {};
    for (const priority of ['High', 'Medium', 'Low']) {
      const priorityTickets = resolvedTickets.filter(
        (t) => t.priority === priority,
      );
      if (priorityTickets.length > 0) {
        const priorityTimes = priorityTickets.map((ticket) => {
          const created = new Date(ticket.createdAt);
          const closed = new Date(ticket.closedAt!);
          return (closed.getTime() - created.getTime()) / (1000 * 60 * 60);
        });
        byPriority[priority.toLowerCase()] = {
          averageResolutionTimeHours:
            priorityTimes.reduce((a, b) => a + b, 0) / priorityTimes.length,
          ticketCount: priorityTickets.length,
        };
      }
    }

    // By queue
    const queueGroups = {};
    const queueMap = new Map();
    for (const ticket of resolvedTickets) {
      if (!queueGroups[ticket.queueId]) {
        queueGroups[ticket.queueId] = [];
      }
      queueGroups[ticket.queueId].push(ticket);

      // Cache queue data
      if (!queueMap.has(ticket.queueId)) {
        try {
          const queue = await this.queuesService.findById(ticket.queueId);
          queueMap.set(ticket.queueId, queue);
        } catch {
          queueMap.set(ticket.queueId, null);
        }
      }
    }

    const byQueue: Array<{
      queueId: string;
      queueName: string;
      averageResolutionTimeHours: number;
      ticketCount: number;
    }> = [];
    for (const [queueId, queueTickets] of Object.entries(queueGroups)) {
      const queueTimes = (queueTickets as Ticket[]).map((ticket) => {
        const created = new Date(ticket.createdAt);
        const closed = new Date(ticket.closedAt!);
        return (closed.getTime() - created.getTime()) / (1000 * 60 * 60);
      });
      const queue = queueMap.get(queueId);
      byQueue.push({
        queueId,
        queueName: queue?.name || 'Unknown Queue',
        averageResolutionTimeHours:
          queueTimes.reduce((a, b) => a + b, 0) / queueTimes.length,
        ticketCount: queueTimes.length,
      });
    }

    // By user (assigned users who resolved tickets)
    const userGroups = {};
    const userMap = new Map();
    for (const ticket of resolvedTickets.filter((t) => t.assignedToId)) {
      if (!userGroups[ticket.assignedToId!]) {
        userGroups[ticket.assignedToId!] = [];
      }
      userGroups[ticket.assignedToId!].push(ticket);

      // Cache user data
      if (!userMap.has(ticket.assignedToId!)) {
        try {
          const user = await this.usersService.findById(ticket.assignedToId!);
          userMap.set(ticket.assignedToId!, user);
        } catch {
          userMap.set(ticket.assignedToId!, null);
        }
      }
    }

    const byUser: Array<{
      userId: string;
      userName: string;
      averageResolutionTimeHours: number;
      ticketCount: number;
    }> = [];
    for (const [userId, userTickets] of Object.entries(userGroups)) {
      const userTimes = (userTickets as Ticket[]).map((ticket) => {
        const created = new Date(ticket.createdAt);
        const closed = new Date(ticket.closedAt!);
        return (closed.getTime() - created.getTime()) / (1000 * 60 * 60);
      });
      const user = userMap.get(userId);
      const userName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        : 'Unknown User';
      byUser.push({
        userId,
        userName,
        averageResolutionTimeHours:
          userTimes.reduce((a, b) => a + b, 0) / userTimes.length,
        ticketCount: userTimes.length,
      });
    }

    return {
      overall: {
        averageResolutionTimeHours,
        medianResolutionTimeHours,
        totalTicketsResolved: resolvedTickets.length,
      },
      byPriority,
      byQueue,
      byUser,
    };
  }

  async getVolumeTrends(
    user: JwtPayloadType,
    filters?: {
      createdAfter?: string;
      createdBefore?: string;
      queueIds?: string[];
      categoryIds?: string[];
      priorities?: TicketPriority[];
    },
  ) {
    // Apply RBAC filters
    const formattedFilters = await this.applyRBACFilters(user, filters);

    // Get date range (default to last 90 days)
    const endDate = filters?.createdBefore
      ? new Date(filters.createdBefore)
      : new Date();
    const startDate = filters?.createdAfter
      ? new Date(filters.createdAfter)
      : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const tickets = await this.ticketRepository.findAll(
      { page: 1, limit: 100000 },
      {
        ...formattedFilters,
        createdAfter: startDate.toISOString(),
        createdBefore: endDate.toISOString(),
      },
    );

    // Daily trends
    const dailyTrends = new Map();
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      dailyTrends.set(dateStr, { created: 0, resolved: 0, closed: 0 });
      current.setDate(current.getDate() + 1);
    }

    // Count tickets by creation date
    tickets.forEach((ticket) => {
      const createdDate = new Date(ticket.createdAt)
        .toISOString()
        .split('T')[0];
      if (dailyTrends.has(createdDate)) {
        dailyTrends.get(createdDate).created++;
      }

      // Count resolved/closed tickets by their status change date
      if (ticket.status === TicketStatus.RESOLVED && ticket.updatedAt) {
        const resolvedDate = new Date(ticket.updatedAt)
          .toISOString()
          .split('T')[0];
        if (dailyTrends.has(resolvedDate)) {
          dailyTrends.get(resolvedDate).resolved++;
        }
      }
      if (ticket.status === TicketStatus.CLOSED && ticket.closedAt) {
        const closedDate = new Date(ticket.closedAt)
          .toISOString()
          .split('T')[0];
        if (dailyTrends.has(closedDate)) {
          dailyTrends.get(closedDate).closed++;
        }
      }
    });

    const daily = Array.from(dailyTrends.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Weekly trends (group by week)
    const weeklyTrends = new Map();
    daily.forEach((day) => {
      const date = new Date(day.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekStartStr = weekStart.toISOString().split('T')[0];

      if (!weeklyTrends.has(weekStartStr)) {
        weeklyTrends.set(weekStartStr, { created: 0, resolved: 0, closed: 0 });
      }

      const week = weeklyTrends.get(weekStartStr);
      week.created += day.created;
      week.resolved += day.resolved;
      week.closed += day.closed;
    });

    const weekly = Array.from(weeklyTrends.entries()).map(
      ([weekStart, counts]) => ({
        weekStart,
        ...counts,
      }),
    );

    // Monthly trends
    const monthlyTrends = new Map();
    daily.forEach((day) => {
      const date = new Date(day.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyTrends.has(monthKey)) {
        monthlyTrends.set(monthKey, { created: 0, resolved: 0, closed: 0 });
      }

      const month = monthlyTrends.get(monthKey);
      month.created += day.created;
      month.resolved += day.resolved;
      month.closed += day.closed;
    });

    const monthly = Array.from(monthlyTrends.entries()).map(
      ([month, counts]) => ({
        month,
        ...counts,
      }),
    );

    return { daily, weekly, monthly };
  }

  async getUserPerformance(
    user: JwtPayloadType,
    filters?: {
      createdAfter?: string;
      createdBefore?: string;
      queueIds?: string[];
      assignedToUserIds?: string[];
    },
  ) {
    // Apply RBAC filters
    const formattedFilters = await this.applyRBACFilters(user, filters);

    const tickets = await this.ticketRepository.findAll(
      { page: 1, limit: 100000 },
      formattedFilters,
    );

    // Group tickets by assigned user
    const userGroups = new Map();

    // Get all unique user IDs from assigned tickets
    const userIds = [
      ...new Set(tickets.map((t) => t.assignedToId).filter(Boolean)),
    ];

    // Initialize user data
    for (const userId of userIds) {
      if (!userGroups.has(userId)) {
        userGroups.set(userId, {
          userId,
          tickets: [],
          totalAssigned: 0,
          totalResolved: 0,
          totalInProgress: 0,
          resolvedLast7Days: 0,
          resolvedLast30Days: 0,
        });
      }
    }

    // Process tickets
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    tickets.forEach((ticket) => {
      if (ticket.assignedToId && userGroups.has(ticket.assignedToId)) {
        const userStats = userGroups.get(ticket.assignedToId);
        userStats.tickets.push(ticket);
        userStats.totalAssigned++;

        if (
          ticket.status === TicketStatus.RESOLVED ||
          ticket.status === TicketStatus.CLOSED
        ) {
          userStats.totalResolved++;

          const updatedDate = new Date(ticket.updatedAt || ticket.createdAt);
          if (updatedDate >= last7Days) {
            userStats.resolvedLast7Days++;
          }
          if (updatedDate >= last30Days) {
            userStats.resolvedLast30Days++;
          }
        } else if (ticket.status === TicketStatus.IN_PROGRESS) {
          userStats.totalInProgress++;
        }
      }
    });

    // Calculate performance metrics and get user details
    const userPerformance: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      totalAssigned: number;
      totalResolved: number;
      totalInProgress: number;
      averageResolutionTimeHours: number;
      ticketsResolvedLast7Days: number;
      ticketsResolvedLast30Days: number;
      resolutionRate: number;
    }> = [];
    for (const [userId, stats] of userGroups) {
      try {
        const userData = await this.usersService.findById(userId);

        // Calculate average resolution time for resolved tickets
        const resolvedTickets = stats.tickets.filter(
          (t) =>
            (t.status === TicketStatus.RESOLVED ||
              t.status === TicketStatus.CLOSED) &&
            t.closedAt,
        );

        let averageResolutionTimeHours = 0;
        if (resolvedTickets.length > 0) {
          const resolutionTimes = resolvedTickets.map((ticket) => {
            const created = new Date(ticket.createdAt);
            const closed = new Date(ticket.closedAt!);
            return (closed.getTime() - created.getTime()) / (1000 * 60 * 60);
          });
          averageResolutionTimeHours =
            resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
        }

        const resolutionRate =
          stats.totalAssigned > 0
            ? (stats.totalResolved / stats.totalAssigned) * 100
            : 0;

        const userName = userData
          ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
            userData.email ||
            'Unknown User'
          : 'Unknown User';

        userPerformance.push({
          userId,
          userName,
          userEmail: userData?.email || 'Unknown',
          totalAssigned: stats.totalAssigned,
          totalResolved: stats.totalResolved,
          totalInProgress: stats.totalInProgress,
          averageResolutionTimeHours,
          ticketsResolvedLast7Days: stats.resolvedLast7Days,
          ticketsResolvedLast30Days: stats.resolvedLast30Days,
          resolutionRate,
        });
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
      }
    }

    return userPerformance.sort((a, b) => b.totalResolved - a.totalResolved);
  }

  async getQueuePerformance(
    user: JwtPayloadType,
    filters?: {
      createdAfter?: string;
      createdBefore?: string;
      queueIds?: string[];
      categoryIds?: string[];
    },
  ) {
    // Apply RBAC filters
    const formattedFilters = await this.applyRBACFilters(user, filters);

    const tickets = await this.ticketRepository.findAll(
      { page: 1, limit: 100000 },
      formattedFilters,
    );

    // Group tickets by queue
    const queueGroups = new Map();

    // Get all unique queue IDs
    const queueIds = [...new Set(tickets.map((t) => t.queueId))];

    // Initialize queue data
    for (const queueId of queueIds) {
      queueGroups.set(queueId, {
        queueId,
        tickets: [],
        totalTickets: 0,
        openTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
        createdLast7Days: 0,
        createdLast30Days: 0,
        categoryMap: new Map(),
      });
    }

    // Process tickets
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    tickets.forEach((ticket) => {
      if (queueGroups.has(ticket.queueId)) {
        const queueStats = queueGroups.get(ticket.queueId);
        queueStats.tickets.push(ticket);
        queueStats.totalTickets++;

        // Count by status
        switch (ticket.status) {
          case TicketStatus.OPENED:
            queueStats.openTickets++;
            break;
          case TicketStatus.IN_PROGRESS:
            queueStats.inProgressTickets++;
            break;
          case TicketStatus.RESOLVED:
            queueStats.resolvedTickets++;
            break;
          case TicketStatus.CLOSED:
            queueStats.closedTickets++;
            break;
        }

        // Count recent tickets
        const createdDate = new Date(ticket.createdAt);
        if (createdDate >= last7Days) {
          queueStats.createdLast7Days++;
        }
        if (createdDate >= last30Days) {
          queueStats.createdLast30Days++;
        }

        // Category breakdown
        const categoryCount =
          queueStats.categoryMap.get(ticket.categoryId) || 0;
        queueStats.categoryMap.set(ticket.categoryId, categoryCount + 1);
      }
    });

    // Calculate performance metrics and get queue/category details
    const queuePerformance: Array<{
      queueId: string;
      queueName: string;
      totalTickets: number;
      openTickets: number;
      inProgressTickets: number;
      resolvedTickets: number;
      closedTickets: number;
      averageResolutionTimeHours: number;
      ticketsCreatedLast7Days: number;
      ticketsCreatedLast30Days: number;
      resolutionRate: number;
      categoryBreakdown: Array<{
        categoryId: string;
        categoryName: string;
        count: number;
      }>;
    }> = [];
    for (const [queueId, stats] of queueGroups) {
      try {
        const queueData = await this.queuesService.findById(queueId);

        // Calculate average resolution time
        const resolvedTickets = stats.tickets.filter(
          (t) =>
            (t.status === TicketStatus.RESOLVED ||
              t.status === TicketStatus.CLOSED) &&
            t.closedAt,
        );

        let averageResolutionTimeHours = 0;
        if (resolvedTickets.length > 0) {
          const resolutionTimes = resolvedTickets.map((ticket) => {
            const created = new Date(ticket.createdAt);
            const closed = new Date(ticket.closedAt!);
            return (closed.getTime() - created.getTime()) / (1000 * 60 * 60);
          });
          averageResolutionTimeHours =
            resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
        }

        const resolutionRate =
          stats.totalTickets > 0
            ? ((stats.resolvedTickets + stats.closedTickets) /
                stats.totalTickets) *
              100
            : 0;

        // Category breakdown with names
        const categoryBreakdown: Array<{
          categoryId: string;
          categoryName: string;
          count: number;
        }> = [];
        for (const [categoryId, count] of stats.categoryMap) {
          try {
            const category = await this.categoriesService.findById(categoryId);
            categoryBreakdown.push({
              categoryId,
              categoryName: category?.name || 'Unknown Category',
              count,
            });
          } catch {
            categoryBreakdown.push({
              categoryId,
              categoryName: 'Unknown Category',
              count,
            });
          }
        }

        queuePerformance.push({
          queueId,
          queueName: queueData?.name || 'Unknown Queue',
          totalTickets: stats.totalTickets,
          openTickets: stats.openTickets,
          inProgressTickets: stats.inProgressTickets,
          resolvedTickets: stats.resolvedTickets,
          closedTickets: stats.closedTickets,
          averageResolutionTimeHours,
          ticketsCreatedLast7Days: stats.createdLast7Days,
          ticketsCreatedLast30Days: stats.createdLast30Days,
          resolutionRate,
          categoryBreakdown: categoryBreakdown.sort(
            (a, b) => b.count - a.count,
          ),
        });
      } catch (error) {
        console.error(`Error fetching queue ${queueId}:`, error);
      }
    }

    return queuePerformance.sort((a, b) => b.totalTickets - a.totalTickets);
  }

  async getStatusFlowAnalytics(
    user: JwtPayloadType,
    filters?: {
      createdAfter?: string;
      createdBefore?: string;
      queueIds?: string[];
      categoryIds?: string[];
    },
  ) {
    // Apply RBAC filters
    const formattedFilters = await this.applyRBACFilters(user, filters);

    // Get tickets and their history
    const tickets = await this.ticketRepository.findAll(
      { page: 1, limit: 100000 },
      formattedFilters,
    );

    if (tickets.length === 0) {
      return {
        averageTimeInStatus: {
          opened: 0,
          inProgress: 0,
          resolved: 0,
        },
        statusTransitions: [],
      };
    }

    // Get history for all tickets in a single query for better performance
    const ticketIds = tickets.map((t) => t.id);
    let allHistory: Array<any> = [];

    try {
      // Use bulk query instead of N+1 individual queries
      allHistory = await this.historyItemsService.findByTicketIds(ticketIds);
    } catch (error) {
      console.error('Error fetching history for tickets:', error);
      return {
        averageTimeInStatus: {
          opened: 0,
          inProgress: 0,
          resolved: 0,
        },
        statusTransitions: [],
      };
    }

    // Analyze status transitions and time in status
    const statusTimes = new Map(); // ticketId -> status -> [startTime, endTime]
    const transitions = new Map(); // "from->to" -> { count, totalTime }

    // Sort history by date for each ticket
    const ticketHistories = new Map();
    allHistory.forEach((h) => {
      if (!ticketHistories.has(h.ticketId)) {
        ticketHistories.set(h.ticketId, []);
      }
      ticketHistories.get(h.ticketId).push(h);
    });

    // Process each ticket's history
    for (const [ticketId, history] of ticketHistories) {
      const sortedHistory = history.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) continue;

      let currentStatus = TicketStatus.OPENED;
      let statusStartTime = new Date(ticket.createdAt);

      // Initialize status tracking
      if (!statusTimes.has(ticketId)) {
        statusTimes.set(ticketId, new Map());
      }

      for (const historyItem of sortedHistory) {
        if (
          historyItem.type === HistoryItemType.STATUS_CHANGED ||
          historyItem.type === HistoryItemType.CLOSED ||
          historyItem.type === HistoryItemType.REOPENED ||
          historyItem.type === HistoryItemType.ASSIGNED
        ) {
          const historyTime = new Date(historyItem.createdAt);

          // Record time spent in current status
          const timeInStatus =
            historyTime.getTime() - statusStartTime.getTime();
          const statusTimeMap = statusTimes.get(ticketId);
          if (!statusTimeMap.has(currentStatus)) {
            statusTimeMap.set(currentStatus, []);
          }
          statusTimeMap.get(currentStatus).push(timeInStatus);

          // Determine new status from history
          let newStatus = currentStatus;
          if (
            historyItem.type === HistoryItemType.ASSIGNED &&
            currentStatus === TicketStatus.OPENED
          ) {
            newStatus = TicketStatus.IN_PROGRESS;
          } else if (historyItem.type === HistoryItemType.CLOSED) {
            newStatus = TicketStatus.CLOSED;
          } else if (historyItem.type === HistoryItemType.REOPENED) {
            newStatus = TicketStatus.OPENED;
          } else if (historyItem.type === HistoryItemType.STATUS_CHANGED) {
            // Parse the new status from the details for STATUS_CHANGED type
            // Handle both enum values and display strings
            if (
              historyItem.details.includes('to Resolved') ||
              historyItem.details.includes('resolved') ||
              historyItem.details.includes('to RESOLVED')
            ) {
              newStatus = TicketStatus.RESOLVED;
            } else if (
              historyItem.details.includes('to In Progress') ||
              historyItem.details.includes('to IN_PROGRESS') ||
              historyItem.details.includes('to inProgress')
            ) {
              newStatus = TicketStatus.IN_PROGRESS;
            } else if (
              historyItem.details.includes('to Opened') ||
              historyItem.details.includes('to OPENED') ||
              historyItem.details.includes('to opened')
            ) {
              newStatus = TicketStatus.OPENED;
            } else if (
              historyItem.details.includes('to Closed') ||
              historyItem.details.includes('to CLOSED') ||
              historyItem.details.includes('to closed')
            ) {
              newStatus = TicketStatus.CLOSED;
            }
          }

          // Record transition
          if (newStatus !== currentStatus) {
            const transitionKey = `${currentStatus}->${newStatus}`;
            if (!transitions.has(transitionKey)) {
              transitions.set(transitionKey, { count: 0, totalTime: 0 });
            }
            const transition = transitions.get(transitionKey);
            transition.count++;
            transition.totalTime += timeInStatus;

            currentStatus = newStatus;
            statusStartTime = historyTime;
          }
        }
      }

      // Record final status time (if ticket is still in that status)
      const now = new Date();
      const finalTime = ticket.closedAt ? new Date(ticket.closedAt) : now;
      const timeInFinalStatus = finalTime.getTime() - statusStartTime.getTime();

      const statusTimeMap = statusTimes.get(ticketId);
      if (!statusTimeMap.has(currentStatus)) {
        statusTimeMap.set(currentStatus, []);
      }
      statusTimeMap.get(currentStatus).push(timeInFinalStatus);
    }

    // Calculate average time in each status
    const averageTimeInStatus = {
      opened: 0,
      inProgress: 0,
      resolved: 0,
    };

    const allStatusTimes = {
      [TicketStatus.OPENED]: [],
      [TicketStatus.IN_PROGRESS]: [],
      [TicketStatus.RESOLVED]: [],
    };

    for (const statusTimeMap of statusTimes.values()) {
      for (const [status, times] of statusTimeMap) {
        if (allStatusTimes[status]) {
          allStatusTimes[status].push(...times);
        }
      }
    }

    // Convert to hours and calculate averages
    for (const [status, times] of Object.entries(allStatusTimes)) {
      if (times.length > 0) {
        const hoursArray = times.map((t) => t / (1000 * 60 * 60));
        const average =
          hoursArray.reduce((a, b) => a + b, 0) / hoursArray.length;

        // Map status enum values to result object keys
        let statusKey: string;
        if (status === TicketStatus.OPENED) {
          statusKey = 'opened';
        } else if (status === TicketStatus.IN_PROGRESS) {
          statusKey = 'inProgress';
        } else if (status === TicketStatus.RESOLVED) {
          statusKey = 'resolved';
        } else {
          // For any other status, use lowercase with underscores removed
          statusKey = status.toLowerCase().replace('_', '');
        }

        if (averageTimeInStatus.hasOwnProperty(statusKey)) {
          averageTimeInStatus[statusKey] = average;
        }
      }
    }

    // Format status transitions
    const statusTransitions = Array.from(transitions.entries()).map(
      ([key, data]) => {
        const [from, to] = key.split('->');
        return {
          from,
          to,
          count: data.count,
          averageTimeHours:
            data.count > 0 ? data.totalTime / data.count / (1000 * 60 * 60) : 0,
        };
      },
    );

    return {
      averageTimeInStatus,
      statusTransitions: statusTransitions.sort((a, b) => b.count - a.count),
    };
  }

  async getPeakHoursAnalytics(
    user: JwtPayloadType,
    filters?: {
      createdAfter?: string;
      createdBefore?: string;
      queueIds?: string[];
      categoryIds?: string[];
    },
  ) {
    // Apply RBAC filters
    const formattedFilters = await this.applyRBACFilters(user, filters);

    // Get tickets
    const tickets = await this.ticketRepository.findAll(
      { page: 1, limit: 100000 },
      formattedFilters,
    );

    if (tickets.length === 0) {
      return {
        hourlyData: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          ticketCount: 0,
        })),
        dailyData: [
          { dayOfWeek: 0, dayName: 'Sunday', ticketCount: 0 },
          { dayOfWeek: 1, dayName: 'Monday', ticketCount: 0 },
          { dayOfWeek: 2, dayName: 'Tuesday', ticketCount: 0 },
          { dayOfWeek: 3, dayName: 'Wednesday', ticketCount: 0 },
          { dayOfWeek: 4, dayName: 'Thursday', ticketCount: 0 },
          { dayOfWeek: 5, dayName: 'Friday', ticketCount: 0 },
          { dayOfWeek: 6, dayName: 'Saturday', ticketCount: 0 },
        ],
        peakHour: 0,
        peakDay: 'Monday',
      };
    }

    // Initialize counters
    const hourlyStats = Array.from({ length: 24 }, () => 0);
    const dailyStats = Array.from({ length: 7 }, () => 0);
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    // Process tickets to count by hour and day
    tickets.forEach((ticket) => {
      const createdDate = new Date(ticket.createdAt);
      const hour = createdDate.getHours();
      const dayOfWeek = createdDate.getDay();

      hourlyStats[hour]++;
      dailyStats[dayOfWeek]++;
    });

    // Find peak hour and day
    const peakHour = hourlyStats.indexOf(Math.max(...hourlyStats));
    const peakDayIndex = dailyStats.indexOf(Math.max(...dailyStats));
    const peakDay = dayNames[peakDayIndex];

    // Format response
    const hourlyData = hourlyStats.map((count, hour) => ({
      hour,
      ticketCount: count,
    }));

    const dailyData = dailyStats.map((count, dayOfWeek) => ({
      dayOfWeek,
      dayName: dayNames[dayOfWeek],
      ticketCount: count,
    }));

    return {
      hourlyData,
      dailyData,
      peakHour,
      peakDay,
    };
  }
}
