// src/user-documents/infrastructure/persistence/user-document.repository.ts
import { NullableType } from '../../../utils/types/nullable.type';
import { UserDocument } from '../../domain/user-document';
import { User } from '../../../users/domain/user';

export abstract class UserDocumentRepository {
  abstract create(
    data: Omit<UserDocument, 'id' | 'uploadedAt' | 'updatedAt'>,
  ): Promise<UserDocument>;

  abstract findById(
    id: UserDocument['id'],
  ): Promise<NullableType<UserDocument>>;

  abstract findAllByUserId(userId: User['id']): Promise<UserDocument[]>;

  abstract delete(id: UserDocument['id']): Promise<void>;
}
