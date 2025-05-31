// src/queues/queues.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { Queue } from './domain/queue';
import { QueueRepository } from './infrastructure/persistence/queue.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class QueuesService {
  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly mailService: MailService,
    private readonly usersService: UsersService,
  ) {}

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

    // Send email notification to the user
    const user = await this.usersService.findById(userId);
    if (user && user.email) {
      await this.mailService.queueAssignment({
        to: user.email,
        data: {
          userName: user.firstName || 'User',
          queueName: queue.name,
          action: 'added',
        },
      });

      // Also send to support@nomadsoft.us for tracking
      await this.mailService.queueAssignment({
        to: 'support@nomadsoft.us',
        data: {
          userName: `${user.firstName} ${user.lastName} (${user.email})`,
          queueName: queue.name,
          action: 'added',
        },
      });
    }

    return queue;
  }

  async removeUser(id: string, userId: string): Promise<Queue> {
    const queue = await this.queueRepository.removeUser(id, userId);
    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    // Send email notification to the user
    const user = await this.usersService.findById(userId);
    if (user && user.email) {
      await this.mailService.queueAssignment({
        to: user.email,
        data: {
          userName: user.firstName || 'User',
          queueName: queue.name,
          action: 'removed',
        },
      });

      // Also send to support@nomadsoft.us for tracking
      await this.mailService.queueAssignment({
        to: 'support@nomadsoft.us',
        data: {
          userName: `${user.firstName} ${user.lastName} (${user.email})`,
          queueName: queue.name,
          action: 'removed',
        },
      });
    }

    return queue;
  }

  async findByName(name: string): Promise<Queue | null> {
    return this.queueRepository.findByName(name);
  }

  async findByCustomId(customId: string): Promise<Queue | null> {
    return this.queueRepository.findByCustomId(customId);
  }

  async findQueuesByUserId(userId: string): Promise<Queue[]> {
    return this.queueRepository.findByUserId(userId, { page: 1, limit: 100 });
  }
}
