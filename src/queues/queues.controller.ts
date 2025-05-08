// src/queues/queues.controller.ts
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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { QueuesService } from './queues.service';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { QueryQueueDto } from './dto/query-queue.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { Queue } from './domain/queue';

@ApiTags('Queues')
@Controller({
  path: 'queues',
  version: '1',
})
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    type: Queue,
  })
  create(@Body() createQueueDto: CreateQueueDto): Promise<Queue> {
    return this.queuesService.create(createQueueDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [Queue],
  })
  findAll(@Query() queryDto: QueryQueueDto): Promise<Queue[]> {
    return this.queuesService.findAll(
      {
        page: queryDto?.page || 1,
        limit: queryDto?.limit || 10,
      },
      queryDto?.search,
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Queue,
  })
  findOne(@Param('id') id: string): Promise<Queue> {
    return this.queuesService.findById(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Queue,
  })
  update(
    @Param('id') id: string,
    @Body() updateQueueDto: UpdateQueueDto,
  ): Promise<Queue> {
    return this.queuesService.update(id, updateQueueDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.queuesService.remove(id);
  }

  @Post(':id/users')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Queue,
  })
  addUser(
    @Param('id') id: string,
    @Body() assignUserDto: AssignUserDto,
  ): Promise<Queue> {
    return this.queuesService.addUser(id, assignUserDto.userId);
  }

  @Delete(':id/users/:userId')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Queue,
  })
  removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<Queue> {
    return this.queuesService.removeUser(id, userId);
  }
}
