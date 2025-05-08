// src/queues/infrastructure/persistence/document/repositories/queue.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Queue } from '../../../../domain/queue';
import { QueueRepository } from '../../queue.repository';
import { QueueSchemaClass } from '../entities/queue.schema';
import { QueueMapper } from '../mappers/queue.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class QueueDocumentRepository implements QueueRepository {
  constructor(
    @InjectModel(QueueSchemaClass.name)
    private queueModel: Model<QueueSchemaClass>,
  ) {}

  async create(
    data: Omit<Queue, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Queue> {
    const persistenceModel = QueueMapper.toPersistence(data as Queue);
    const createdQueue = new this.queueModel(persistenceModel);
    const queueObject = await createdQueue.save();
    return QueueMapper.toDomain(queueObject);
  }

  async findById(id: Queue['id']): Promise<NullableType<Queue>> {
    const queueObject = await this.queueModel.findById(id);
    return queueObject ? QueueMapper.toDomain(queueObject) : null;
  }

  async findAll(
    paginationOptions: IPaginationOptions,
    search?: string,
  ): Promise<Queue[]> {
    const query: FilterQuery<QueueSchemaClass> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const queueObjects = await this.queueModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .limit(paginationOptions.limit);

    return queueObjects.map((queueObject) => QueueMapper.toDomain(queueObject));
  }

  async update(
    id: Queue['id'],
    payload: Partial<Omit<Queue, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Queue | null> {
    const filter = { _id: id.toString() };
    const queue = await this.queueModel.findOne(filter);

    if (!queue) {
      return null;
    }

    const queueObject = await this.queueModel.findOneAndUpdate(
      filter,
      { $set: payload },
      { new: true },
    );

    return queueObject ? QueueMapper.toDomain(queueObject) : null;
  }

  async remove(id: Queue['id']): Promise<void> {
    await this.queueModel.deleteOne({ _id: id.toString() });
  }

  async findByUserId(
    userId: string,
    paginationOptions: IPaginationOptions,
  ): Promise<Queue[]> {
    const queueObjects = await this.queueModel
      .find({ assignedUserIds: userId })
      .sort({ createdAt: -1 })
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .limit(paginationOptions.limit);

    return queueObjects.map((queueObject) => QueueMapper.toDomain(queueObject));
  }

  async addUser(id: Queue['id'], userId: string): Promise<Queue | null> {
    const queueObject = await this.queueModel.findOneAndUpdate(
      { _id: id.toString() },
      { $addToSet: { assignedUserIds: userId } },
      { new: true },
    );

    return queueObject ? QueueMapper.toDomain(queueObject) : null;
  }

  async removeUser(id: Queue['id'], userId: string): Promise<Queue | null> {
    const queueObject = await this.queueModel.findOneAndUpdate(
      { _id: id.toString() },
      { $pull: { assignedUserIds: userId } },
      { new: true },
    );

    return queueObject ? QueueMapper.toDomain(queueObject) : null;
  }
}
