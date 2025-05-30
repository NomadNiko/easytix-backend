// src/queues/queues.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { Queue } from './domain/queue';
import { QueueRepository } from './infrastructure/persistence/queue.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';

@Injectable()
export class QueuesService {
  constructor(private readonly queueRepository: QueueRepository) {}

  async create(createQueueDto: CreateQueueDto): Promise<Queue> {
    return this.queueRepository.create({
      name: createQueueDto.name,
      description: createQueueDto.description || '',
      assignedUserIds: createQueueDto.assignedUserIds || [],
    });
  }

  async findAll(
    paginationOptions: IPaginationOptions,
    search?: string,
  ): Promise<Queue[]> {
    return this.queueRepository.findAll(paginationOptions, search);
  }

  async findById(id: string): Promise<Queue> {
    const queue = await this.queueRepository.findById(id);
    if (!queue) {
      throw new NotFoundException('Queue not found');
    }
    return queue;
  }

  async update(id: string, updateQueueDto: UpdateQueueDto): Promise<Queue> {
    const queue = await this.queueRepository.update(id, updateQueueDto);
    if (!queue) {
      throw new NotFoundException('Queue not found');
    }
    return queue;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // Check if exists
    return this.queueRepository.remove(id);
  }

  async findByUserId(
    userId: string,
    paginationOptions: IPaginationOptions,
  ): Promise<Queue[]> {
    return this.queueRepository.findByUserId(userId, paginationOptions);
  }

  async addUser(id: string, userId: string): Promise<Queue> {
    const queue = await this.queueRepository.addUser(id, userId);
    if (!queue) {
      throw new NotFoundException('Queue not found');
    }
    return queue;
  }

  async removeUser(id: string, userId: string): Promise<Queue> {
    const queue = await this.queueRepository.removeUser(id, userId);
    if (!queue) {
      throw new NotFoundException('Queue not found');
    }
    return queue;
  }

  async findByName(name: string): Promise<Queue | null> {
    return this.queueRepository.findByName(name);
  }
}
