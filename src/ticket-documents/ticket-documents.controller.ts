// src/ticket-documents/ticket-documents.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  Response,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { TicketDocumentsService } from './ticket-documents.service';
import { CreateTicketDocumentDto } from './dto/create-ticket-document.dto';
import { TicketDocument } from './domain/ticket-document';

@ApiTags('Ticket Documents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'ticket-documents',
  version: '1',
})
export class TicketDocumentsController {
  constructor(
    private readonly ticketDocumentsService: TicketDocumentsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: TicketDocument,
  })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Request() request,
    @Body() createTicketDocumentDto: CreateTicketDocumentDto,
  ): Promise<TicketDocument> {
    return this.ticketDocumentsService.create(
      request.user,
      createTicketDocumentDto,
    );
  }

  @Post('upload-file')
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({
    description: 'File uploaded successfully',
  })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @Request() request,
    @UploadedFile() file: Express.Multer.File,
    @Body('ticketId') ticketId: string,
  ) {
    return this.ticketDocumentsService.uploadFile(file, ticketId, request.user);
  }

  @Get(':ticketId')
  @ApiOkResponse({
    type: [TicketDocument],
  })
  @HttpCode(HttpStatus.OK)
  findAllByTicketId(
    @Param('ticketId') ticketId: string,
  ): Promise<TicketDocument[]> {
    return this.ticketDocumentsService.findAllByTicketId(ticketId);
  }

  @Get(':ticketId/:documentId/download')
  @ApiParam({
    name: 'ticketId',
    type: String,
    required: true,
  })
  @ApiParam({
    name: 'documentId',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    description: 'Document file',
  })
  @HttpCode(HttpStatus.OK)
  async downloadDocument(
    @Param('ticketId') ticketId: string,
    @Param('documentId') documentId: string,
    @Response() response,
  ) {
    return this.ticketDocumentsService.downloadDocument(
      ticketId,
      documentId,
      response,
    );
  }

  @Delete(':ticketId/:documentId')
  @ApiParam({
    name: 'ticketId',
    type: String,
    required: true,
  })
  @ApiParam({
    name: 'documentId',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Request() request,
    @Param('ticketId') ticketId: string,
    @Param('documentId') documentId: string,
  ): Promise<void> {
    return this.ticketDocumentsService.delete(
      request.user,
      ticketId,
      documentId,
    );
  }
}
