// src/ticket-documents/infrastructure/persistence/document/entities/ticket-document.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, now } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';
import { FileSchemaClass } from '../../../../../files/infrastructure/persistence/document/entities/file.schema';

export type TicketDocumentSchemaDocument =
  HydratedDocument<TicketDocumentSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class TicketDocumentSchemaClass extends EntityDocumentHelper {
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  ticketId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileSchemaClass',
    required: true,
  })
  file: FileSchemaClass;

  @Prop({ required: true })
  name: string;

  @Prop({ default: now })
  uploadedAt: Date;

  @Prop({ default: now })
  updatedAt: Date;
}

export const TicketDocumentSchema = SchemaFactory.createForClass(
  TicketDocumentSchemaClass,
);
TicketDocumentSchema.index({ ticketId: 1 });
