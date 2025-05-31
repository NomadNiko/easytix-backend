// src/queues/infrastructure/persistence/document/entities/queue.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';

export type QueueSchemaDocument = HydratedDocument<QueueSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class QueueSchemaClass extends EntityDocumentHelper {
  @Prop({ required: true, unique: true, index: true })
  customId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: [String], default: [] })
  assignedUserIds: string[];

  @Prop({ default: now })
  createdAt: Date;

  @Prop({ default: now })
  updatedAt: Date;
}

export const QueueSchema = SchemaFactory.createForClass(QueueSchemaClass);
QueueSchema.index({ name: 'text', description: 'text' });
