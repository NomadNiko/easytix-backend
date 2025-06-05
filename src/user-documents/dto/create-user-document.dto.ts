// src/user-documents/dto/create-user-document.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { FileDto } from '../../files/dto/file.dto';
import { Transform } from 'class-transformer';

export class CreateUserDocumentDto {
  @ApiProperty()
  @IsNotEmpty()
  file: FileDto;

  @ApiProperty({ example: 'document.pdf' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  name: string;
}
