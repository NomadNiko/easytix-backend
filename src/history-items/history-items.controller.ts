// src/history-items/history-items.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HistoryItemsService } from './history-items.service';
import { CreateHistoryItemDto } from './dto/create-history-item.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { HistoryItem, HistoryItemType } from './domain/history-item';

@ApiTags('History Items')
@Controller({
  path: 'history-items',
  version: '1',
})
export class HistoryItemsController {
  constructor(private readonly historyItemsService: HistoryItemsService) {}

  @Get('ticket/:ticketId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: [HistoryItem],
  })
  findByTicketId(@Param('ticketId') ticketId: string): Promise<HistoryItem[]> {
    return this.historyItemsService.findByTicketId(ticketId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    type: HistoryItem,
  })
  create(
    @Request() request,
    @Body() createHistoryItemDto: CreateHistoryItemDto,
  ): Promise<HistoryItem> {
    return this.historyItemsService.create({
      ...createHistoryItemDto,
      userId: request.user.id,
    });
  }

  @Post('ticket/:ticketId/comment')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({
    type: HistoryItem,
  })
  createComment(
    @Request() request,
    @Param('ticketId') ticketId: string,
    @Body() createCommentDto: CreateCommentDto,
  ): Promise<HistoryItem> {
    return this.historyItemsService.create({
      ticketId,
      userId: request.user.id,
      type: HistoryItemType.COMMENT,
      details: createCommentDto.details,
    });
  }
}
