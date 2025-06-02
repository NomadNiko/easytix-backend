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

  private async getTicketIdsWithComments(search: string): Promise<string[]> {
    // Find all comments that match the search term
    const comments = await this.historyItemModel.find({
      type: HistoryItemType.COMMENT,
      details: { $regex: search, $options: 'i' },
    }).select('ticketId');
    
    // Extract unique ticket IDs
    return [...new Set(comments.map(comment => comment.ticketId))];
  }

  private async buildQuery(filters?: {
    queueId?: string;
    categoryId?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: string;
    createdById?: string;
    search?: string;
    userIds?: string[];
    serviceDeskFilter?: {
      queueIds: string[];
      userId: string;
    };
  }): Promise<FilterQuery<TicketSchemaClass>> {
    const query: FilterQuery<TicketSchemaClass> = {};
    const andConditions: any[] = [];

    // Basic filters
    if (filters?.queueId) {
      query.queueId = filters.queueId;
    }

    if (filters?.categoryId) {
      query.categoryId = filters.categoryId;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.priority) {
      query.priority = filters.priority;
    }

    // Handle assignedToId and createdById only if userIds is not provided
    if (!filters?.userIds || filters.userIds.length === 0) {
      if (filters?.assignedToId) {
        query.assignedToId = filters.assignedToId;
      } else if (filters?.assignedToId === null) {
        query.assignedToId = null;
      }

      if (filters?.createdById) {
        query.createdById = filters.createdById;
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
      const ticketIdsWithComments = await this.getTicketIdsWithComments(filters.search);
      andConditions.push({
        $or: [
          { title: { $regex: filters.search, $options: 'i' } },
          { details: { $regex: filters.search, $options: 'i' } },
          { _id: { $in: ticketIdsWithComments } },
        ],
      });
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
      search?: string;
      userIds?: string[];
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

  async findAllWithoutPagination(
    filters?: {
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      createdById?: string;
      search?: string;
      userIds?: string[];
      serviceDeskFilter?: {
        queueIds: string[];
        userId: string;
      };
    },
  ): Promise<Ticket[]> {
    const query = await this.buildQuery(filters);

    const ticketObjects = await this.ticketModel
      .find(query)
      .sort({ createdAt: -1 });

    return ticketObjects.map((ticketObject) =>
      TicketMapper.toDomain(ticketObject),
    );
  }

  async countAll(
    filters?: {
      queueId?: string;
      categoryId?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
      createdById?: string;
      search?: string;
      userIds?: string[];
      serviceDeskFilter?: {
        queueIds: string[];
        userId: string;
      };
    },
  ): Promise<number> {
    const query = await this.buildQuery(filters);
    return this.ticketModel.countDocuments(query);
  }
}
