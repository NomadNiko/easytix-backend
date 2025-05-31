// src/system-defaults/system-defaults.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { SystemDefaultsService } from './system-defaults.service';
import { CreateSystemDefaultDto } from './dto/create-system-default.dto';
import { UpdateSystemDefaultDto } from './dto/update-system-default.dto';
import { SystemDefault } from './domain/system-default';
import { FilterSystemDefaultDto, SortSystemDefaultDto } from './dto/query-system-default.dto';
import { QueuesService } from '../queues/queues.service';
import { CategoriesService } from '../categories/categories.service';

@ApiTags('System Defaults')
@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({
  path: 'system-defaults',
  version: '1',
})
export class SystemDefaultsController {
  constructor(
    private readonly systemDefaultsService: SystemDefaultsService,
    private readonly queuesService: QueuesService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    type: SystemDefault,
  })
  create(@Body() createSystemDefaultDto: CreateSystemDefaultDto): Promise<SystemDefault> {
    return this.systemDefaultsService.create(createSystemDefaultDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [SystemDefault],
  })
  findAll(
    @Query() filterDto?: FilterSystemDefaultDto,
    @Query('sort') sortOptions?: SortSystemDefaultDto[],
  ): Promise<SystemDefault[]> {
    return this.systemDefaultsService.findAll(filterDto, sortOptions);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: SystemDefault,
  })
  findOne(@Param('id') id: string): Promise<SystemDefault | null> {
    return this.systemDefaultsService.findById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: SystemDefault,
  })
  update(
    @Param('id') id: string,
    @Body() updateSystemDefaultDto: UpdateSystemDefaultDto,
  ): Promise<SystemDefault> {
    return this.systemDefaultsService.update(id, updateSystemDefaultDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.systemDefaultsService.remove(id);
  }

  // Convenience endpoints for common operations
  @Post('set-default-queue/:queueId')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: SystemDefault,
  })
  async setDefaultQueue(@Param('queueId') queueId: string): Promise<SystemDefault> {
    // Validate that the queue exists by customId
    const queue = await this.queuesService.findByCustomId(queueId);
    if (!queue) {
      throw new NotFoundException(`Queue with ID "${queueId}" not found`);
    }
    return this.systemDefaultsService.setDefaultQueueId(queueId);
  }

  @Post('set-default-category/:categoryId')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: SystemDefault,
  })
  async setDefaultCategory(@Param('categoryId') categoryId: string): Promise<SystemDefault> {
    // Validate that the category exists by customId
    const category = await this.categoriesService.findByCustomId(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }
    return this.systemDefaultsService.setDefaultCategoryId(categoryId);
  }

  @Get('default-queue/current')
  @HttpCode(HttpStatus.OK)
  async getCurrentDefaultQueue(): Promise<{ queueId: string | null }> {
    const queueId = await this.systemDefaultsService.getDefaultQueueId();
    return { queueId };
  }

  @Get('default-category/current')
  @HttpCode(HttpStatus.OK)
  async getCurrentDefaultCategory(): Promise<{ categoryId: string | null }> {
    const categoryId = await this.systemDefaultsService.getDefaultCategoryId();
    return { categoryId };
  }
}