import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { NullableType } from '../utils/types/nullable.type';
import { FilterUserDto, SortUserDto } from './dto/query-user.dto';
import { User } from './domain/user';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { UserCreateService } from './services/user-create.service';
import { UserReadService } from './services/user-read.service';
import { UserUpdateService } from './services/user-update.service';
import { UserDeleteService } from './services/user-delete.service';
import { getDefaultNotificationPreferences } from './infrastructure/persistence/document/entities/user.schema';

@Injectable()
export class UsersService {
  constructor(
    private readonly userCreateService: UserCreateService,
    private readonly userReadService: UserReadService,
    private readonly userUpdateService: UserUpdateService,
    private readonly userDeleteService: UserDeleteService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.userCreateService.create(createUserDto);
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    return this.userReadService.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findById(id: User['id']): Promise<NullableType<User>> {
    return this.userReadService.findById(id);
  }

  findByIds(ids: User['id'][]): Promise<User[]> {
    return this.userReadService.findByIds(ids);
  }

  findByEmail(email: User['email']): Promise<NullableType<User>> {
    return this.userReadService.findByEmail(email);
  }

  findBySocialIdAndProvider({
    socialId,
    provider,
  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    return this.userReadService.findBySocialIdAndProvider({
      socialId,
      provider,
    });
  }

  async update(
    id: User['id'],
    updateUserDto: UpdateUserDto,
  ): Promise<User | null> {
    return this.userUpdateService.update(id, updateUserDto);
  }

  async remove(id: User['id']): Promise<void> {
    await this.userDeleteService.remove(id);
  }

  async getNotificationPreferences(id: User['id']): Promise<any> {
    const user = await this.userReadService.findById(id);
    return user?.notificationPreferences || getDefaultNotificationPreferences();
  }

  async updateNotificationPreferences(
    id: User['id'],
    updatePreferencesDto: UpdateNotificationPreferencesDto,
  ): Promise<any> {
    const user = await this.userReadService.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const currentPreferences =
      user.notificationPreferences || getDefaultNotificationPreferences();
    const updatedPreferences = {
      ...currentPreferences,
      ...updatePreferencesDto,
    };

    await this.userUpdateService.update(id, {
      notificationPreferences: updatedPreferences,
    } as UpdateUserDto);

    return updatedPreferences;
  }
}
