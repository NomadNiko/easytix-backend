// src/history-items/infrastructure/persistence/document/entities/history-item.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';
import { HistoryItemType } from '../../../../domain/history-item';

export type HistoryItemSchemaDocument =
  HydratedDocument<HistoryItemSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class HistoryItemSchemaClass extends EntityDocumentHelper {
  @Prop({ required: true, index: true })
  ticketId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({
    required: true,
    type: String,
    enum: HistoryItemType,
    default: HistoryItemType.COMMENT,
  })
  type: HistoryItemType;

  @Prop({ required: true })
  details: string;

  @Prop({ default: now })
  createdAt: Date;
}

export const HistoryItemSchema = SchemaFactory.createForClass(
  HistoryItemSchemaClass,
);
HistoryItemSchema.index({ ticketId: 1, createdAt: -1 });
