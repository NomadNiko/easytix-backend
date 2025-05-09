// src/ticket-documents/dto/create-ticket-document.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { FileDto } from '../../files/dto/file.dto';
import { Transform } from 'class-transformer';

export class CreateTicketDocumentDto {
  @ApiProperty()
  @IsNotEmpty()
  file: FileDto;

  @ApiProperty({ example: 'Requirements.pdf' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: '60a5d5d0e95b0b2d6c5c5e5a' })
  @IsString()
  @IsNotEmpty()
  ticketId: string;
}
