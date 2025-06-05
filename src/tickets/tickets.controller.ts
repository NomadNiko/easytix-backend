// src/tickets/tickets.controller.ts
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
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { TicketsService } from './tickets.service';
import { PublicTicketService } from './services/public-ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreatePublicTicketDto } from './dto/create-public-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { BatchUpdateTicketsDto } from './dto/batch-update-tickets.dto';
import { BatchAssignTicketsDto } from './dto/batch-assign-tickets.dto';
import { Ticket, TicketStatus } from './domain/ticket';
import { FileDto } from '../files/dto/file.dto';

@ApiTags('Tickets')
@Controller({
  path: 'tickets',
  version: '1',
})
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly publicTicketService: PublicTicketService,
  ) {}

  @Post('public')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    type: Ticket,
    description:
      'Create a ticket without authentication. Creates a new user account if email does not exist.',
  })
  createPublic(
    @Body() createPublicTicketDto: CreatePublicTicketDto,
  ): Promise<Ticket> {
    return this.publicTicketService.createPublicTicket(createPublicTicketDto);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    type: Ticket,
  })
  create(
    @Request() request,
    @Body() createTicketDto: CreateTicketDto,
  ): Promise<Ticket> {
    return this.ticketsService.create(request.user.id, createTicketDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Ticket' },
        },
        hasNextPage: {
          type: 'boolean',
        },
        total: {
          type: 'number',
          description: 'Total number of tickets matching the filters',
        },
      },
    },
  })
  findAll(@Request() request, @Query() queryDto: QueryTicketDto) {
    return this.ticketsService.findAllPaginated(
      request.user,
      {
        page: queryDto?.page || 1,
        limit: queryDto?.limit || 20,
      },
      {
        // New array-based filters (primary)
        search: queryDto?.search,
        queueIds: queryDto?.queueIds,
        categoryIds: queryDto?.categoryIds,
        statuses: queryDto?.statuses,
        priorities: queryDto?.priorities,
        assignedToUserIds: queryDto?.assignedToUserIds,
        createdByUserIds: queryDto?.createdByUserIds,
        unassigned: queryDto?.unassigned,
        createdAfter: queryDto?.createdAfter,
        createdBefore: queryDto?.createdBefore,
        updatedAfter: queryDto?.updatedAfter,
        updatedBefore: queryDto?.updatedBefore,
        closedAfter: queryDto?.closedAfter,
        closedBefore: queryDto?.closedBefore,
        hasDocuments: queryDto?.hasDocuments,
        hasComments: queryDto?.hasComments,
        includeArchived: queryDto?.includeArchived,
        sortBy: queryDto?.sortBy,
        sortOrder: queryDto?.sortOrder,

        // Legacy support (for backward compatibility)
        queueId: queryDto?.queueId,
        categoryId: queryDto?.categoryId,
        status: queryDto?.status,
        priority: queryDto?.priority,
        assignedToId: queryDto?.assignedToId,
        createdById: queryDto?.createdById,
        userIds: queryDto?.userIds,
      },
    );
  }

  @Get('statistics')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        open: { type: 'number' },
        closed: { type: 'number' },
        byPriority: {
          type: 'object',
          properties: {
            high: { type: 'number' },
            medium: { type: 'number' },
            low: { type: 'number' },
          },
        },
        byQueue: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              queueId: { type: 'string' },
              queueName: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  getStatistics(@Request() request, @Query() queryDto: QueryTicketDto) {
    return this.ticketsService.getStatistics(request.user, {
      // New array-based filters (primary)
      search: queryDto?.search,
      queueIds: queryDto?.queueIds,
      categoryIds: queryDto?.categoryIds,
      statuses: queryDto?.statuses,
      priorities: queryDto?.priorities,
      assignedToUserIds: queryDto?.assignedToUserIds,
      createdByUserIds: queryDto?.createdByUserIds,
      unassigned: queryDto?.unassigned,
      createdAfter: queryDto?.createdAfter,
      createdBefore: queryDto?.createdBefore,
      updatedAfter: queryDto?.updatedAfter,
      updatedBefore: queryDto?.updatedBefore,
      closedAfter: queryDto?.closedAfter,
      closedBefore: queryDto?.closedBefore,
      hasDocuments: queryDto?.hasDocuments,
      hasComments: queryDto?.hasComments,
      includeArchived: queryDto?.includeArchived,

      // Legacy support (for backward compatibility)
      queueId: queryDto?.queueId,
      categoryId: queryDto?.categoryId,
      status: queryDto?.status,
      priority: queryDto?.priority,
      assignedToId: queryDto?.assignedToId,
      createdById: queryDto?.createdById,
      userIds: queryDto?.userIds,
    });
  }

  @Get('all')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [Ticket],
    description:
      'Returns all tickets accessible by the user without pagination',
  })
  findAllWithoutPagination(
    @Request() request,
    @Query() queryDto: QueryTicketDto,
  ) {
    return this.ticketsService.findAllWithoutPagination(request.user, {
      // New array-based filters (primary)
      search: queryDto?.search,
      queueIds: queryDto?.queueIds,
      categoryIds: queryDto?.categoryIds,
      statuses: queryDto?.statuses,
      priorities: queryDto?.priorities,
      assignedToUserIds: queryDto?.assignedToUserIds,
      createdByUserIds: queryDto?.createdByUserIds,
      unassigned: queryDto?.unassigned,
      createdAfter: queryDto?.createdAfter,
      createdBefore: queryDto?.createdBefore,
      updatedAfter: queryDto?.updatedAfter,
      updatedBefore: queryDto?.updatedBefore,
      closedAfter: queryDto?.closedAfter,
      closedBefore: queryDto?.closedBefore,
      hasDocuments: queryDto?.hasDocuments,
      hasComments: queryDto?.hasComments,
      includeArchived: queryDto?.includeArchived,
      sortBy: queryDto?.sortBy,
      sortOrder: queryDto?.sortOrder,

      // Legacy support (for backward compatibility)
      queueId: queryDto?.queueId,
      categoryId: queryDto?.categoryId,
      status: queryDto?.status,
      priority: queryDto?.priority,
      assignedToId: queryDto?.assignedToId,
      createdById: queryDto?.createdById,
      userIds: queryDto?.userIds,
    });
  }

  @Get('analytics/resolution-time')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        overall: {
          type: 'object',
          properties: {
            averageResolutionTimeHours: { type: 'number' },
            medianResolutionTimeHours: { type: 'number' },
            totalTicketsResolved: { type: 'number' },
          },
        },
        byPriority: {
          type: 'object',
          properties: {
            high: { type: 'object' },
            medium: { type: 'object' },
            low: { type: 'object' },
          },
        },
        byQueue: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              queueId: { type: 'string' },
              queueName: { type: 'string' },
              averageResolutionTimeHours: { type: 'number' },
              ticketCount: { type: 'number' },
            },
          },
        },
        byUser: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              userName: { type: 'string' },
              averageResolutionTimeHours: { type: 'number' },
              ticketCount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  getResolutionTimeAnalytics(
    @Request() request,
    @Query() queryDto: QueryTicketDto,
  ) {
    return this.ticketsService.getResolutionTimeAnalytics(request.user, {
      createdAfter: queryDto?.createdAfter,
      createdBefore: queryDto?.createdBefore,
      closedAfter: queryDto?.closedAfter,
      closedBefore: queryDto?.closedBefore,
      queueIds: queryDto?.queueIds,
      categoryIds: queryDto?.categoryIds,
      priorities: queryDto?.priorities,
      assignedToUserIds: queryDto?.assignedToUserIds,
    });
  }

  @Get('analytics/volume-trends')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        daily: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              created: { type: 'number' },
              resolved: { type: 'number' },
              closed: { type: 'number' },
            },
          },
        },
        weekly: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              weekStart: { type: 'string' },
              created: { type: 'number' },
              resolved: { type: 'number' },
              closed: { type: 'number' },
            },
          },
        },
        monthly: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              month: { type: 'string' },
              created: { type: 'number' },
              resolved: { type: 'number' },
              closed: { type: 'number' },
            },
          },
        },
      },
    },
  })
  getVolumeTrends(@Request() request, @Query() queryDto: QueryTicketDto) {
    return this.ticketsService.getVolumeTrends(request.user, {
      createdAfter: queryDto?.createdAfter,
      createdBefore: queryDto?.createdBefore,
      queueIds: queryDto?.queueIds,
      categoryIds: queryDto?.categoryIds,
      priorities: queryDto?.priorities,
    });
  }

  @Get('analytics/user-performance')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          userName: { type: 'string' },
          userEmail: { type: 'string' },
          totalAssigned: { type: 'number' },
          totalResolved: { type: 'number' },
          totalInProgress: { type: 'number' },
          averageResolutionTimeHours: { type: 'number' },
          ticketsResolvedLast7Days: { type: 'number' },
          ticketsResolvedLast30Days: { type: 'number' },
          resolutionRate: { type: 'number' },
        },
      },
    },
  })
  getUserPerformance(@Request() request, @Query() queryDto: QueryTicketDto) {
    return this.ticketsService.getUserPerformance(request.user, {
      createdAfter: queryDto?.createdAfter,
      createdBefore: queryDto?.createdBefore,
      queueIds: queryDto?.queueIds,
      assignedToUserIds: queryDto?.assignedToUserIds,
    });
  }

  @Get('analytics/queue-performance')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          queueId: { type: 'string' },
          queueName: { type: 'string' },
          totalTickets: { type: 'number' },
          openTickets: { type: 'number' },
          inProgressTickets: { type: 'number' },
          resolvedTickets: { type: 'number' },
          closedTickets: { type: 'number' },
          averageResolutionTimeHours: { type: 'number' },
          ticketsCreatedLast7Days: { type: 'number' },
          ticketsCreatedLast30Days: { type: 'number' },
          resolutionRate: { type: 'number' },
          categoryBreakdown: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                categoryId: { type: 'string' },
                categoryName: { type: 'string' },
                count: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  getQueuePerformance(@Request() request, @Query() queryDto: QueryTicketDto) {
    return this.ticketsService.getQueuePerformance(request.user, {
      createdAfter: queryDto?.createdAfter,
      createdBefore: queryDto?.createdBefore,
      queueIds: queryDto?.queueIds,
      categoryIds: queryDto?.categoryIds,
    });
  }

  @Get('analytics/status-flow')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        averageTimeInStatus: {
          type: 'object',
          properties: {
            opened: { type: 'number' },
            inProgress: { type: 'number' },
            resolved: { type: 'number' },
          },
        },
        statusTransitions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              count: { type: 'number' },
              averageTimeHours: { type: 'number' },
            },
          },
        },
      },
    },
  })
  getStatusFlowAnalytics(
    @Request() request,
    @Query() queryDto: QueryTicketDto,
  ) {
    return this.ticketsService.getStatusFlowAnalytics(request.user, {
      createdAfter: queryDto?.createdAfter,
      createdBefore: queryDto?.createdBefore,
      queueIds: queryDto?.queueIds,
      categoryIds: queryDto?.categoryIds,
    });
  }

  @Get('analytics/peak-hours')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        hourlyData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              hour: { type: 'number' },
              ticketCount: { type: 'number' },
            },
          },
        },
        dailyData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dayOfWeek: { type: 'number' },
              dayName: { type: 'string' },
              ticketCount: { type: 'number' },
            },
          },
        },
        peakHour: { type: 'number' },
        peakDay: { type: 'string' },
      },
    },
  })
  getPeakHoursAnalytics(@Request() request, @Query() queryDto: QueryTicketDto) {
    return this.ticketsService.getPeakHoursAnalytics(request.user, {
      createdAfter: queryDto?.createdAfter,
      createdBefore: queryDto?.createdBefore,
      queueIds: queryDto?.queueIds,
      categoryIds: queryDto?.categoryIds,
    });
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Ticket,
  })
  findOne(@Request() request, @Param('id') id: string): Promise<Ticket> {
    return this.ticketsService.findById(id, request.user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin, RoleEnum.serviceDesk)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Ticket,
  })
  update(
    @Request() request,
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ): Promise<Ticket> {
    return this.ticketsService.update(request.user, id, updateTicketDto);
  }

  @Patch(':id/assign')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin, RoleEnum.serviceDesk)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Ticket,
  })
  assign(
    @Request() request,
    @Param('id') id: string,
    @Body() assignTicketDto: AssignTicketDto,
  ): Promise<Ticket> {
    return this.ticketsService.assign(request.user, id, assignTicketDto.userId);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin, RoleEnum.serviceDesk)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Ticket,
  })
  updateStatus(
    @Request() request,
    @Param('id') id: string,
    @Body('status') status: TicketStatus,
    @Body('closingNotes') closingNotes?: string,
  ): Promise<Ticket> {
    return this.ticketsService.updateStatus(
      request.user,
      id,
      status,
      closingNotes,
    );
  }

  @Post(':id/documents')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Ticket,
  })
  addDocument(
    @Request() request,
    @Param('id') id: string,
    @Body() fileDto: FileDto,
  ): Promise<Ticket> {
    return this.ticketsService.addDocument(request.user.id, id, fileDto.id);
  }

  @Delete(':id/documents/:documentId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Ticket,
  })
  removeDocument(
    @Request() request,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ): Promise<Ticket> {
    return this.ticketsService.removeDocument(request.user.id, id, documentId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() request, @Param('id') id: string): Promise<void> {
    return this.ticketsService.remove(request.user, id);
  }

  @Patch('batch')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin, RoleEnum.serviceDesk)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [Ticket],
    description: 'Batch update multiple tickets',
  })
  batchUpdate(
    @Request() request,
    @Body() batchUpdateDto: BatchUpdateTicketsDto,
  ): Promise<Ticket[]> {
    return this.ticketsService.batchUpdateTickets(
      request.user,
      batchUpdateDto.updates,
    );
  }

  @Patch('batch/assign')
  @ApiBearerAuth()
  @Roles(RoleEnum.admin, RoleEnum.serviceDesk)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [Ticket],
    description: 'Batch assign multiple tickets to a user',
  })
  batchAssign(
    @Request() request,
    @Body() batchAssignDto: BatchAssignTicketsDto,
  ): Promise<Ticket[]> {
    return this.ticketsService.batchAssignTickets(
      request.user,
      batchAssignDto.ticketIds,
      batchAssignDto.userId,
    );
  }
}
