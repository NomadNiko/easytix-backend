// src/tickets/infrastructure/persistence/ticket.repository.ts
import { NullableType } from '../../../utils/types/nullable.type';
import { Ticket, TicketPriority, TicketStatus } from '../../domain/ticket';
import { IPaginationOptions } from '../../../utils/types/pagination-options';

export abstract class TicketRepository {
  abstract create(
    data: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'closedAt'>,
  ): Promise<Ticket>;
  abstract findById(id: Ticket['id']): Promise<NullableType<Ticket>>;
  abstract findAll(
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
      createdAfter?: string;
      createdBefore?: string;
      serviceDeskFilter?: {
        queueIds: string[];
        userId: string;
      };
    },
  ): Promise<Ticket[]>;
  abstract findAllWithoutPagination(filters?: {
    queueId?: string;
    categoryId?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: string;
    createdById?: string;
    search?: string;
    userIds?: string[];
    createdAfter?: string;
    createdBefore?: string;
    serviceDeskFilter?: {
      queueIds: string[];
      userId: string;
    };
  }): Promise<Ticket[]>;
  abstract countAll(filters?: {
    queueId?: string;
    categoryId?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: string;
    createdById?: string;
    search?: string;
    userIds?: string[];
    createdAfter?: string;
    createdBefore?: string;
    serviceDeskFilter?: {
      queueIds: string[];
      userId: string;
    };
  }): Promise<number>;
  abstract update(
    id: Ticket['id'],
    payload: Partial<
      Omit<Ticket, 'id' | 'queueId' | 'createdById' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<Ticket | null>;
  abstract addDocument(
    id: Ticket['id'],
    documentId: string,
  ): Promise<Ticket | null>;
  abstract removeDocument(
    id: Ticket['id'],
    documentId: string,
  ): Promise<Ticket | null>;
  abstract remove(id: Ticket['id']): Promise<void>;
}
