// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  SerializeOptions,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';

import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { QueryUserDto } from './dto/query-user.dto';
import { User } from './domain/user';
import { UsersService } from './users.service';
import { RolesGuard } from '../roles/roles.guard';
import { infinityPagination } from '../utils/infinity-pagination';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt')) // Keep authentication, remove role restriction
@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiCreatedResponse({
    type: User,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post()
  @Roles(RoleEnum.admin) // Apply role restriction to create
  @UseGuards(RolesGuard) // Add RolesGuard here
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProfileDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createProfileDto);
  }

  @ApiOkResponse({
    type: InfinityPaginationResponse(User),
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: QueryUserDto,
  ): Promise<InfinityPaginationResponseDto<User>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.usersService.findManyWithPagination({
        filterOptions: query?.filters,
        sortOptions: query?.sort,
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @ApiOkResponse({
    type: [User],
    description: 'Get multiple users by IDs',
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('batch')
  @HttpCode(HttpStatus.OK)
  async findByIds(@Query('ids') ids: string | string[]): Promise<User[]> {
    // Handle both single ID and array of IDs
    const userIds = Array.isArray(ids) ? ids : [ids];

    // Filter out empty or invalid IDs
    const validIds = userIds.filter((id) => id && id.trim());

    if (validIds.length === 0) {
      return [];
    }

    // Fetch all users in parallel
    const users = await Promise.all(
      validIds.map((id) => this.usersService.findById(id).catch(() => null)),
    );

    // Filter out null results
    return users.filter((user): user is User => user !== null);
  }

  @ApiOkResponse({
    type: User,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  findOne(@Param('id') id: User['id']): Promise<NullableType<User>> {
    return this.usersService.findById(id);
  }

  @ApiOkResponse({
    type: User,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch(':id')
  @Roles(RoleEnum.admin) // Apply role restriction to update
  @UseGuards(RolesGuard) // Add RolesGuard here
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  update(
    @Param('id') id: User['id'],
    @Body() updateProfileDto: UpdateUserDto,
  ): Promise<User | null> {
    return this.usersService.update(id, updateProfileDto);
  }

  @Delete(':id')
  @Roles(RoleEnum.admin) // Apply role restriction to delete
  @UseGuards(RolesGuard) // Add RolesGuard here
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: User['id']): Promise<void> {
    return this.usersService.remove(id);
  }

  @ApiOkResponse({
    type: 'object',
    description: 'User notification preferences',
  })
  @SerializeOptions({
    groups: ['me'],
  })
  @Get(':id/notification-preferences')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  getNotificationPreferences(@Param('id') id: User['id']): Promise<any> {
    return this.usersService.getNotificationPreferences(id);
  }

  @ApiOkResponse({
    type: 'object',
    description: 'Updated notification preferences',
  })
  @SerializeOptions({
    groups: ['me'],
  })
  @Patch(':id/notification-preferences')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  updateNotificationPreferences(
    @Param('id') id: User['id'],
    @Body() updatePreferencesDto: UpdateNotificationPreferencesDto,
  ): Promise<any> {
    return this.usersService.updateNotificationPreferences(
      id,
      updatePreferencesDto,
    );
  }
}
