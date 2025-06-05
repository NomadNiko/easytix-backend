// src/categories/infrastructure/persistence/document/entities/category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';

export type CategorySchemaDocument = HydratedDocument<CategorySchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class CategorySchemaClass extends EntityDocumentHelper {
  @Prop({ required: true, unique: true, index: true })
  customId: string;

  @Prop({ required: true, index: true })
  queueId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: now })
  createdAt: Date;

  @Prop({ default: now })
  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(CategorySchemaClass);
CategorySchema.index({ queueId: 1 });
