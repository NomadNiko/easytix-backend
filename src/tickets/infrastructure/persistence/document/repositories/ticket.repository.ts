// src/tickets/infrastructure/persistence/document/repositories/ticket.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { NullableType } from '../../../../../utils/types/nullable.type';
import {
  Ticket,
  TicketPriority,
  TicketStatus,
} from '../../../../domain/ticket';
import { TicketRepository } from '../../ticket.repository';
import { TicketSchemaClass } from '../entities/ticket.schema';
import { TicketMapper } from '../mappers/ticket.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import { HistoryItemSchemaClass } from '../../../../../history-items/infrastructure/persistence/document/entities/history-item.schema';
import { HistoryItemType } from '../../../../../history-items/domain/history-item';

@Injectable()
export class TicketDocumentRepository implements TicketRepository {
  constructor(
    @InjectModel(TicketSchemaClass.name)
    private ticketModel: Model<TicketSchemaClass>,
    @InjectModel(HistoryItemSchemaClass.name)
    private historyItemModel: Model<HistoryItemSchemaClass>,
  ) {}

  async create(
    data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'closedAt'>,
  ): Promise<Ticket> {
    const persistenceModel = TicketMapper.toPersistence(data as Ticket);
    const createdTicket = new this.ticketModel(persistenceModel);
    const ticketObject = await createdTicket.save();
    return TicketMapper.toDomain(ticketObject);
  }

  async findById(id: Ticket['id']): Promise<NullableType<Ticket>> {
    const ticketObject = await this.ticketModel.findById(id);
    return ticketObject ? TicketMapper.toDomain(ticketObject) : null;
  }

  private async getTicketIdsWithComments(search?: string): Promise<string[]> {
    // Build query for comments
    const commentQuery: any = { type: HistoryItemType.COMMENT };

    // If search term provided, add regex filter
    if (search && search.length > 0) {
      commentQuery.details = { $regex: search, $options: 'i' };
    }

    // Find all comments that match the criteria
    const comments = await this.historyItemModel
      .find(commentQuery)
      .select('ticketId');

    // Extract unique ticket IDs
    return [...new Set(comments.map((comment) => comment.ticketId))];
  }

  private async buildQuery(filters?: {
    // Legacy single parameters
    queueId?: string;
    categoryId?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: string;
    createdById?: string;
    // New array-based parameters
    queueIds?: string[];
    categoryIds?: string[];
    statuses?: TicketStatus[];
    priorities?: TicketPriority[];
    assignedToUserIds?: string[] | null;
    createdByUserIds?: string[];
    // Other parameters
    search?: string;
    userIds?: string[];
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    closedAfter?: string;
    closedBefore?: string;
    hasDocuments?: boolean;
    hasComments?: boolean;
    includeArchived?: boolean;
    serviceDeskFilter?: {
      queueIds: string[];
      userId: string;
    };
  }): Promise<FilterQuery<TicketSchemaClass>> {
    const query: FilterQuery<TicketSchemaClass> = {};
    const andConditions: any[] = [];

    // Handle queue filters (both single and array)
    if (filters?.queueId) {
      query.queueId = filters.queueId;
    } else if (filters?.queueIds && filters.queueIds.length > 0) {
      query.queueId = { $in: filters.queueIds };
    }

    // Handle category filters (both single and array)
    if (filters?.categoryId) {
      query.categoryId = filters.categoryId;
    } else if (filters?.categoryIds && filters.categoryIds.length > 0) {
      query.categoryId = { $in: filters.categoryIds };
    }

    // Handle status filters (both single and array)
    if (filters?.status) {
      query.status = filters.status;
    } else if (filters?.statuses && filters.statuses.length > 0) {
      query.status = { $in: filters.statuses };
    }

    // Handle priority filters (both single and array)
    if (filters?.priority) {
      query.priority = filters.priority;
    } else if (filters?.priorities && filters.priorities.length > 0) {
      query.priority = { $in: filters.priorities };
    }

    // Handle user assignment filters
    if (!filters?.userIds || filters.userIds.length === 0) {
      // Handle legacy single user filters
      if (filters?.assignedToId) {
        query.assignedToId = filters.assignedToId;
      } else if (filters?.assignedToId === null) {
        query.assignedToId = null;
      }

      if (filters?.createdById) {
        query.createdById = filters.createdById;
      }

      // Handle new array-based user filters
      if (filters?.assignedToUserIds !== undefined) {
        if (filters.assignedToUserIds === null) {
          // Handle unassigned filter
          query.assignedToId = null;
        } else if (filters.assignedToUserIds.length > 0) {
          query.assignedToId = { $in: filters.assignedToUserIds };
        }
      }

      if (filters?.createdByUserIds && filters.createdByUserIds.length > 0) {
        query.createdById = { $in: filters.createdByUserIds };
      }
    }

    // Handle multiple user IDs filter
    if (filters?.userIds && filters.userIds.length > 0) {
      andConditions.push({
        $or: [
          { createdById: { $in: filters.userIds } },
          { assignedToId: { $in: filters.userIds } },
        ],
      });
    }

    // Handle service desk filter
    if (filters?.serviceDeskFilter) {
      andConditions.push({
        $or: [
          { queueId: { $in: filters.serviceDeskFilter.queueIds } },
          { createdById: filters.serviceDeskFilter.userId },
        ],
      });
    }

    // Handle search filter
    if (filters?.search) {
      const ticketIdsWithComments = await this.getTicketIdsWithComments(
        filters.search,
      );
      andConditions.push({
        $or: [
          { title: { $regex: filters.search, $options: 'i' } },
          { details: { $regex: filters.search, $options: 'i' } },
          { _id: { $in: ticketIdsWithComments } },
        ],
      });
    }

    // Handle date filters
    if (filters?.createdAfter || filters?.createdBefore) {
      const dateQuery: any = {};
      if (filters.createdAfter) {
        dateQuery.$gte = new Date(filters.createdAfter);
      }
      if (filters.createdBefore) {
        dateQuery.$lte = new Date(filters.createdBefore);
      }
      query.createdAt = dateQuery;
    }

    if (filters?.updatedAfter || filters?.updatedBefore) {
      const dateQuery: any = {};
      if (filters.updatedAfter) {
        dateQuery.$gte = new Date(filters.updatedAfter);
      }
      if (filters.updatedBefore) {
        dateQuery.$lte = new Date(filters.updatedBefore);
      }
      query.updatedAt = dateQuery;
    }

    if (filters?.closedAfter || filters?.closedBefore) {
      const dateQuery: any = {};
      if (filters.closedAfter) {
        dateQuery.$gte = new Date(filters.closedAfter);
      }
      if (filters.closedBefore) {
        dateQuery.$lte = new Date(filters.closedBefore);
      }
      query.closedAt = dateQuery;
    }

    // Handle advanced filters
    if (filters?.hasDocuments === true) {
      query.documentIds = { $exists: true, $ne: [] };
    } else if (filters?.hasDocuments === false) {
      query.documentIds = { $exists: true, $eq: [] };
    }

    if (filters?.hasComments === true) {
      // Get ticket IDs that have comments
      const ticketIdsWithComments = await this.getTicketIdsWithComments();
      if (ticketIdsWithComments.length > 0) {
        andConditions.push({ _id: { $in: ticketIdsWithComments } });
      } else {
        andConditions.push({ _id: { $in: [] } }); // No tickets have comments
      }
    }

    if (filters?.includeArchived !== true) {
      // By default, exclude archived tickets
      query.archived = { $ne: true };
    }

    // Combine all conditions
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    return query;
  }

  async findAll(
    paginationOptions: IPaginationOptions,
    filters?: {
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      createdById?: string;
      queueIds?: string[];
      categoryIds?: string[];
      statuses?: TicketStatus[];
      priorities?: TicketPriority[];
      assignedToUserIds?: string[] | null;
      createdByUserIds?: string[];
      search?: string;
      userIds?: string[];
      createdAfter?: string;
      createdBefore?: string;
      updatedAfter?: string;
      updatedBefore?: string;
      closedAfter?: string;
      closedBefore?: string;
      hasDocuments?: boolean;
      hasComments?: boolean;
      includeArchived?: boolean;
      serviceDeskFilter?: {
        queueIds: string[];
        userId: string;
      };
    },
  ): Promise<Ticket[]> {
    const query = await this.buildQuery(filters);

    const ticketObjects = await this.ticketModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .limit(paginationOptions.limit);

    return ticketObjects.map((ticketObject) =>
      TicketMapper.toDomain(ticketObject),
    );
  }

  async update(
    id: Ticket['id'],
    payload: Partial<
      Omit<Ticket, 'id' | 'queueId' | 'createdById' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<Ticket | null> {
    const filter = { _id: id.toString() };
    const ticket = await this.ticketModel.findOne(filter);

    if (!ticket) {
      return null;
    }

    // If we're closing the ticket, set the closedAt timestamp
    if (
      payload.status === TicketStatus.CLOSED &&
      ticket.status !== TicketStatus.CLOSED
    ) {
      payload.closedAt = new Date();
    }

    // If we're reopening the ticket, clear the closedAt timestamp
    if (
      payload.status === TicketStatus.OPENED &&
      ticket.status === TicketStatus.CLOSED
    ) {
      payload.closedAt = null;
    }

    const ticketObject = await this.ticketModel.findOneAndUpdate(
      filter,
      { $set: payload },
      { new: true },
    );

    return ticketObject ? TicketMapper.toDomain(ticketObject) : null;
  }

  async addDocument(
    id: Ticket['id'],
    documentId: string,
  ): Promise<Ticket | null> {
    const ticketObject = await this.ticketModel.findOneAndUpdate(
      { _id: id.toString() },
      { $addToSet: { documentIds: documentId } },
      { new: true },
    );

    return ticketObject ? TicketMapper.toDomain(ticketObject) : null;
  }

  async removeDocument(
    id: Ticket['id'],
    documentId: string,
  ): Promise<Ticket | null> {
    const ticketObject = await this.ticketModel.findOneAndUpdate(
      { _id: id.toString() },
      { $pull: { documentIds: documentId } },
      { new: true },
    );

    return ticketObject ? TicketMapper.toDomain(ticketObject) : null;
  }

  async remove(id: Ticket['id']): Promise<void> {
    await this.ticketModel.deleteOne({ _id: id.toString() });
  }

  async findAllWithoutPagination(filters?: {
    queueId?: string;
    categoryId?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: string;
    createdById?: string;
    queueIds?: string[];
    categoryIds?: string[];
    statuses?: TicketStatus[];
    priorities?: TicketPriority[];
    assignedToUserIds?: string[] | null;
    createdByUserIds?: string[];
    search?: string;
    userIds?: string[];
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    closedAfter?: string;
    closedBefore?: string;
    hasDocuments?: boolean;
    hasComments?: boolean;
    includeArchived?: boolean;
    serviceDeskFilter?: {
      queueIds: string[];
      userId: string;
    };
  }): Promise<Ticket[]> {
    const query = await this.buildQuery(filters);

    const ticketObjects = await this.ticketModel
      .find(query)
      .sort({ createdAt: -1 });

    return ticketObjects.map((ticketObject) =>
      TicketMapper.toDomain(ticketObject),
    );
  }

  async countAll(filters?: {
    queueId?: string;
    categoryId?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: string;
    createdById?: string;
    queueIds?: string[];
    categoryIds?: string[];
    statuses?: TicketStatus[];
    priorities?: TicketPriority[];
    assignedToUserIds?: string[] | null;
    createdByUserIds?: string[];
    search?: string;
    userIds?: string[];
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
    closedAfter?: string;
    closedBefore?: string;
    hasDocuments?: boolean;
    hasComments?: boolean;
    includeArchived?: boolean;
    serviceDeskFilter?: {
      queueIds: string[];
      userId: string;
    };
  }): Promise<number> {
    const query = await this.buildQuery(filters);
    return this.ticketModel.countDocuments(query);
  }
}
