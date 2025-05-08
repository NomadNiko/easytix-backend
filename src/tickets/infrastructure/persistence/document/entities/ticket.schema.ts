// src/tickets/infrastructure/persistence/document/entities/ticket.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';
import { TicketPriority, TicketStatus } from '../../../../domain/ticket';

export type TicketSchemaDocument = HydratedDocument<TicketSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class TicketSchemaClass extends EntityDocumentHelper {
  @Prop({ required: true, index: true })
  queueId: string;

  @Prop({ required: true, index: true })
  categoryId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  details: string;

  @Prop({
    required: true,
    enum: TicketStatus,
    default: TicketStatus.OPENED,
    index: true,
  })
  status: TicketStatus;

  @Prop({
    required: true,
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
    index: true,
  })
  priority: TicketPriority;

  @Prop({ type: String, default: null, index: true })
  assignedToId: string | null;

  @Prop({ required: true, index: true })
  createdById: string;

  @Prop({ type: [String], default: [] })
  documentIds: string[];

  @Prop({ default: now })
  createdAt: Date;

  @Prop({ default: now })
  updatedAt: Date;

  @Prop({ type: Date, default: null })
  closedAt: Date | null;
}

export const TicketSchema = SchemaFactory.createForClass(TicketSchemaClass);
TicketSchema.index({ title: 'text', details: 'text' });
