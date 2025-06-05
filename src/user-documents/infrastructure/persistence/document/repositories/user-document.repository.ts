// src/user-documents/infrastructure/persistence/document/repositories/user-document.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { UserDocumentRepository } from '../../user-document.repository';
import { UserDocument } from '../../../../domain/user-document';
import { UserDocumentSchemaClass } from '../entities/user-document.schema';
import { UserDocumentMapper } from '../mappers/user-document.mapper';
import { User } from '../../../../../users/domain/user';

@Injectable()
export class UserDocumentDocumentRepository implements UserDocumentRepository {
  constructor(
    @InjectModel(UserDocumentSchemaClass.name)
    private userDocumentModel: Model<UserDocumentSchemaClass>,
  ) {}

  async create(
    data: Omit<UserDocument, 'id' | 'uploadedAt' | 'updatedAt'>,
  ): Promise<UserDocument> {
    const persistenceModel = UserDocumentMapper.toPersistence(
      data as UserDocument,
    );
    const createdUserDocument = new this.userDocumentModel(persistenceModel);
    const userDocumentObject = await createdUserDocument.save();
    return UserDocumentMapper.toDomain(userDocumentObject);
  }

  async findById(id: UserDocument['id']): Promise<NullableType<UserDocument>> {
    const userDocumentObject = await this.userDocumentModel
      .findById(id)
      .populate('file');

    if (!userDocumentObject) {
      return null;
    }

    return UserDocumentMapper.toDomain(userDocumentObject);
  }

  async findAllByUserId(userId: User['id']): Promise<UserDocument[]> {
    const userDocumentObjects = await this.userDocumentModel
      .find({ user: userId.toString() })
      .populate('file')
      .sort({ uploadedAt: -1 });

    return userDocumentObjects.map((userDocumentObject) =>
      UserDocumentMapper.toDomain(userDocumentObject),
    );
  }

  async delete(id: UserDocument['id']): Promise<void> {
    await this.userDocumentModel.deleteOne({ _id: id.toString() });
  }
}
