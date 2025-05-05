// src/user-documents/user-documents.controller.ts
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
    UnauthorizedException,
    UseGuards 
  } from '@nestjs/common';
  import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
  import { AuthGuard } from '@nestjs/passport';
  import { UserDocumentsService } from './user-documents.service';
  import { CreateUserDocumentDto } from './dto/create-user-document.dto';
  import { UserDocument } from './domain/user-document';
  
  @ApiTags('User Documents')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Controller({
    path: 'user-documents',
    version: '1',
  })
  export class UserDocumentsController {
    constructor(private readonly userDocumentsService: UserDocumentsService) {}
  
    @Post()
    @ApiCreatedResponse({
      type: UserDocument,
    })
    @HttpCode(HttpStatus.CREATED)
    create(
      @Request() request,
      @Body() createUserDocumentDto: CreateUserDocumentDto,
    ): Promise<UserDocument> {
      return this.userDocumentsService.create(
        request.user,
        createUserDocumentDto,
      );
    }
  
    @Get()
    @ApiOkResponse({
      type: [UserDocument],
    })
    @HttpCode(HttpStatus.OK)
    findAll(@Request() request): Promise<UserDocument[]> {
      return this.userDocumentsService.findAllByUser(request.user.id);
    }
  
    @Get(':id/download')
    @ApiParam({
      name: 'id',
      type: String,
      required: true,
    })
    @ApiOkResponse({
      description: 'Document file',
    })
    @HttpCode(HttpStatus.OK)
    async downloadDocument(
      @Request() request,
      @Param('id') id: UserDocument['id'],
      @Response() response,
    ) {
      return this.userDocumentsService.downloadDocument(request.user, id, response);
    }
  
    @Delete(':id')
    @ApiParam({
      name: 'id',
      type: String,
      required: true,
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(
      @Request() request,
      @Param('id') id: UserDocument['id'],
    ): Promise<void> {
      return this.userDocumentsService.delete(request.user, id);
    }
  }