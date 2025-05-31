// src/system-defaults/system-defaults.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { SystemDefaultRepository } from './infrastructure/persistence/system-default.repository';
import { SystemDefault, SystemDefaultKey } from './domain/system-default';
import { CreateSystemDefaultDto } from './dto/create-system-default.dto';
import { UpdateSystemDefaultDto } from './dto/update-system-default.dto';
import { FilterSystemDefaultDto, SortSystemDefaultDto } from './dto/query-system-default.dto';
import { NullableType } from '../utils/types/nullable.type';

@Injectable()
export class SystemDefaultsService {
  constructor(private readonly systemDefaultRepository: SystemDefaultRepository) {}

  async create(createSystemDefaultDto: CreateSystemDefaultDto): Promise<SystemDefault> {
    // Check if key already exists
    const existing = await this.systemDefaultRepository.findByKey(createSystemDefaultDto.key);
    if (existing) {
      throw new ConflictException(`System default with key "${createSystemDefaultDto.key}" already exists`);
    }

    return this.systemDefaultRepository.create(createSystemDefaultDto);
  }

  async findAll(
    filterOptions?: FilterSystemDefaultDto,
    sortOptions?: SortSystemDefaultDto[],
  ): Promise<SystemDefault[]> {
    return this.systemDefaultRepository.findAll(filterOptions, sortOptions);
  }

  async findByKey(key: string): Promise<NullableType<SystemDefault>> {
    return this.systemDefaultRepository.findByKey(key);
  }

  async findById(id: string): Promise<NullableType<SystemDefault>> {
    return this.systemDefaultRepository.findById(id);
  }

  async update(id: string, updateSystemDefaultDto: UpdateSystemDefaultDto): Promise<SystemDefault> {
    const systemDefault = await this.systemDefaultRepository.findById(id);
    if (!systemDefault) {
      throw new NotFoundException(`System default with ID "${id}" not found`);
    }

    const updatedSystemDefault = await this.systemDefaultRepository.update(id, updateSystemDefaultDto);
    if (!updatedSystemDefault) {
      throw new NotFoundException(`System default with ID "${id}" not found`);
    }

    return updatedSystemDefault;
  }

  async remove(id: string): Promise<void> {
    const systemDefault = await this.systemDefaultRepository.findById(id);
    if (!systemDefault) {
      throw new NotFoundException(`System default with ID "${id}" not found`);
    }

    return this.systemDefaultRepository.remove(id);
  }

  // Helper methods for common system defaults
  async getDefaultQueueId(): Promise<string | null> {
    const defaultQueue = await this.findByKey(SystemDefaultKey.DEFAULT_QUEUE_ID);
    return defaultQueue?.value || null;
  }

  async getDefaultCategoryId(): Promise<string | null> {
    const defaultCategory = await this.findByKey(SystemDefaultKey.DEFAULT_CATEGORY_ID);
    return defaultCategory?.value || null;
  }

  async setDefaultQueueId(queueId: string): Promise<SystemDefault> {
    const existing = await this.findByKey(SystemDefaultKey.DEFAULT_QUEUE_ID);
    if (existing) {
      return this.update(existing.id, { 
        value: queueId, 
        description: 'Default queue for public ticket submissions' 
      });
    } else {
      return this.create({
        key: SystemDefaultKey.DEFAULT_QUEUE_ID,
        value: queueId,
        description: 'Default queue for public ticket submissions',
      });
    }
  }

  async setDefaultCategoryId(categoryId: string): Promise<SystemDefault> {
    const existing = await this.findByKey(SystemDefaultKey.DEFAULT_CATEGORY_ID);
    if (existing) {
      return this.update(existing.id, { 
        value: categoryId, 
        description: 'Default category for public ticket submissions' 
      });
    } else {
      return this.create({
        key: SystemDefaultKey.DEFAULT_CATEGORY_ID,
        value: categoryId,
        description: 'Default category for public ticket submissions',
      });
    }
  }
}