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
import { TicketsService } from './tickets.service';
import { PublicTicketService } from './services/public-ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreatePublicTicketDto } from './dto/create-public-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
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
    type: [Ticket],
  })
  findAll(@Query() queryDto: QueryTicketDto): Promise<Ticket[]> {
    return this.ticketsService.findAll(
      {
        page: queryDto?.page || 1,
        limit: queryDto?.limit || 10,
      },
      {
        queueId: queryDto?.queueId,
        categoryId: queryDto?.categoryId,
        status: queryDto?.status,
        priority: queryDto?.priority,
        assignedToId: queryDto?.assignedToId,
        createdById: queryDto?.createdById,
        search: queryDto?.search,
      },
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Ticket,
  })
  findOne(@Param('id') id: string): Promise<Ticket> {
    return this.ticketsService.findById(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Ticket,
  })
  update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ): Promise<Ticket> {
    return this.ticketsService.update(id, updateTicketDto);
  }

  @Patch(':id/assign')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Ticket,
  })
  assign(
    @Request() request,
    @Param('id') id: string,
    @Body() assignTicketDto: AssignTicketDto,
  ): Promise<Ticket> {
    return this.ticketsService.assign(
      request.user.id,
      id,
      assignTicketDto.userId,
    );
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: Ticket,
  })
  updateStatus(
    @Request() request,
    @Param('id') id: string,
    @Body('status') status: TicketStatus,
  ): Promise<Ticket> {
    return this.ticketsService.updateStatus(request.user.id, id, status);
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
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() request, @Param('id') id: string): Promise<void> {
    return this.ticketsService.remove(request.user, id);
  }
}
