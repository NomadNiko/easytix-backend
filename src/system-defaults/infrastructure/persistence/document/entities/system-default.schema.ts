// src/system-defaults/infrastructure/persistence/document/entities/system-default.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';

export type SystemDefaultSchemaDocument = HydratedDocument<SystemDefaultSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class SystemDefaultSchemaClass extends EntityDocumentHelper {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  value: string;

  @Prop()
  description: string;

  @Prop({ default: now })
  createdAt: Date;

  @Prop({ default: now })
  updatedAt: Date;
}

export const SystemDefaultSchema = SchemaFactory.createForClass(SystemDefaultSchemaClass);
SystemDefaultSchema.index({ key: 1 }, { unique: true });