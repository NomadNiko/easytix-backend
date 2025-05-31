// src/system-defaults/infrastructure/persistence/document/repositories/system-default.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemDefaultRepository } from '../../system-default.repository';
import { SystemDefault } from '../../../../domain/system-default';
import { SystemDefaultSchemaClass } from '../entities/system-default.schema';
import { SystemDefaultMapper } from '../mappers/system-default.mapper';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { FilterSystemDefaultDto, SortSystemDefaultDto } from '../../../../dto/query-system-default.dto';

@Injectable()
export class SystemDefaultDocumentRepository implements SystemDefaultRepository {
  constructor(
    @InjectModel(SystemDefaultSchemaClass.name)
    private readonly systemDefaultModel: Model<SystemDefaultSchemaClass>,
  ) {}

  async create(data: Omit<SystemDefault, 'id' | 'createdAt' | 'updatedAt'>): Promise<SystemDefault> {
    const persistenceModel = SystemDefaultMapper.toPersistence(data);
    const createdSystemDefault = new this.systemDefaultModel(persistenceModel);
    const systemDefaultObject = await createdSystemDefault.save();
    return SystemDefaultMapper.toDomain(systemDefaultObject);
  }

  async findByKey(key: string): Promise<NullableType<SystemDefault>> {
    const systemDefaultObject = await this.systemDefaultModel.findOne({ key });
    return systemDefaultObject ? SystemDefaultMapper.toDomain(systemDefaultObject) : null;
  }

  async findById(id: SystemDefault['id']): Promise<NullableType<SystemDefault>> {
    const systemDefaultObject = await this.systemDefaultModel.findById(id);
    return systemDefaultObject ? SystemDefaultMapper.toDomain(systemDefaultObject) : null;
  }

  async findAll(
    filterOptions?: FilterSystemDefaultDto | null,
    sortOptions?: SortSystemDefaultDto[] | null,
  ): Promise<SystemDefault[]> {
    const where: Record<string, any> = {};
    
    if (filterOptions?.key) {
      where.key = filterOptions.key;
    }

    const query = this.systemDefaultModel.find(where);

    if (sortOptions?.length) {
      const sortObject: Record<string, 1 | -1> = {};
      sortOptions.forEach((sort) => {
        sortObject[sort.orderBy] = sort.order.toLowerCase() === 'asc' ? 1 : -1;
      });
      query.sort(sortObject);
    }

    const systemDefaultObjects = await query.exec();
    return systemDefaultObjects.map((systemDefaultObject) =>
      SystemDefaultMapper.toDomain(systemDefaultObject),
    );
  }

  async update(
    id: SystemDefault['id'],
    payload: Partial<SystemDefault>,
  ): Promise<SystemDefault | null> {
    const clonedPayload = { ...payload };
    delete clonedPayload.id;

    const filter = { _id: id };
    const systemDefaultObject = await this.systemDefaultModel.findOneAndUpdate(
      filter,
      SystemDefaultMapper.toPersistence(clonedPayload),
      { new: true },
    );

    return systemDefaultObject ? SystemDefaultMapper.toDomain(systemDefaultObject) : null;
  }

  async remove(id: SystemDefault['id']): Promise<void> {
    await this.systemDefaultModel.deleteOne({ _id: id });
  }
}