// src/categories/categories.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './domain/category';
import { CategoryRepository } from './infrastructure/persistence/category.repository';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.categoryRepository.create({
      queueId: createCategoryDto.queueId,
      name: createCategoryDto.name,
    });
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }

  async findByQueueId(queueId: string): Promise<Category[]> {
    return this.categoryRepository.findByQueueId(queueId);
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.categoryRepository.update(
      id,
      updateCategoryDto,
    );
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // Check if exists
    return this.categoryRepository.remove(id);
  }

  async findByNameAndQueue(
    name: string,
    queueId: string,
  ): Promise<Category | null> {
    return this.categoryRepository.findByNameAndQueue(name, queueId);
  }

  async findByCustomId(customId: string): Promise<Category | null> {
    return this.categoryRepository.findByCustomId(customId);
  }
}
