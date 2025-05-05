// src/user-documents/infrastructure/persistence/document/entities/user-document.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, now } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';
import { UserSchemaClass } from '../../../../../users/infrastructure/persistence/document/entities/user.schema';
import { FileSchemaClass } from '../../../../../files/infrastructure/persistence/document/entities/file.schema';

export type UserDocumentSchemaDocument =
  HydratedDocument<UserDocumentSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class UserDocumentSchemaClass extends EntityDocumentHelper {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSchemaClass',
    required: true,
  })
  user: UserSchemaClass;

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

export const UserDocumentSchema = SchemaFactory.createForClass(
  UserDocumentSchemaClass,
);
UserDocumentSchema.index({ user: 1 });
