// src/categories/infrastructure/persistence/document/repositories/category.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Category } from '../../../../domain/category';
import { CategoryRepository } from '../../category.repository';
import { CategorySchemaClass } from '../entities/category.schema';
import { CategoryMapper } from '../mappers/category.mapper';
import { IdGeneratorService } from '../../../../../utils/id-generator.service';

@Injectable()
export class CategoryDocumentRepository implements CategoryRepository {
  constructor(
    @InjectModel(CategorySchemaClass.name)
    private categoryModel: Model<CategorySchemaClass>,
    private idGeneratorService: IdGeneratorService,
  ) {}

  async create(
    data: Omit<Category, 'id' | 'customId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Category> {
    // Get the next sequence number
    const lastCategory = await this.categoryModel
      .findOne({ customId: { $regex: /^tc-\d{4}$/ } })
      .sort({ customId: -1 });

    let nextSequence = 1;
    if (lastCategory && lastCategory.customId) {
      nextSequence =
        this.idGeneratorService.extractCategorySequence(lastCategory.customId) +
        1;
    }

    // Generate custom ID
    const customId = this.idGeneratorService.generateCategoryId(nextSequence);

    const persistenceModel = CategoryMapper.toPersistence({
      ...data,
      customId,
    } as Category);
    const createdCategory = new this.categoryModel(persistenceModel);
    const categoryObject = await createdCategory.save();
    return CategoryMapper.toDomain(categoryObject);
  }

  async findById(id: Category['id']): Promise<NullableType<Category>> {
    const categoryObject = await this.categoryModel.findById(id);
    return categoryObject ? CategoryMapper.toDomain(categoryObject) : null;
  }

  async findAll(): Promise<Category[]> {
    const categoryObjects = await this.categoryModel.find({}).sort({ name: 1 });

    return categoryObjects.map((categoryObject) =>
      CategoryMapper.toDomain(categoryObject),
    );
  }

  async findByQueueId(queueId: string): Promise<Category[]> {
    const categoryObjects = await this.categoryModel
      .find({ queueId })
      .sort({ name: 1 });

    return categoryObjects.map((categoryObject) =>
      CategoryMapper.toDomain(categoryObject),
    );
  }

  async update(
    id: Category['id'],
    payload: Partial<
      Omit<Category, 'id' | 'queueId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<Category | null> {
    const filter = { _id: id.toString() };
    const category = await this.categoryModel.findOne(filter);

    if (!category) {
      return null;
    }

    const categoryObject = await this.categoryModel.findOneAndUpdate(
      filter,
      { $set: payload },
      { new: true },
    );

    return categoryObject ? CategoryMapper.toDomain(categoryObject) : null;
  }

  async remove(id: Category['id']): Promise<void> {
    await this.categoryModel.deleteOne({ _id: id.toString() });
  }

  async findByNameAndQueue(
    name: string,
    queueId: string,
  ): Promise<NullableType<Category>> {
    const categoryObject = await this.categoryModel.findOne({ name, queueId });
    return categoryObject ? CategoryMapper.toDomain(categoryObject) : null;
  }

  async findByCustomId(customId: string): Promise<NullableType<Category>> {
    const categoryObject = await this.categoryModel.findOne({ customId });
    return categoryObject ? CategoryMapper.toDomain(categoryObject) : null;
  }
}
