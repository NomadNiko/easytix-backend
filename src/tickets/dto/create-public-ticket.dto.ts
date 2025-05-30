import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { lowerCaseTransformer } from '../../utils/transformers/lower-case.transformer';
import { TicketPriority } from '../domain/ticket';

export class CreatePublicTicketDto {
  // Ticket fields - queue and category will be set to defaults by backend
  @ApiPropertyOptional({
    example: 'Queue ID',
    description: 'Optional - backend will use default queue if not provided',
  })
  @IsOptional()
  @IsString()
  queueId?: string;

  @ApiPropertyOptional({
    example: 'Category ID',
    description: 'Optional - backend will use default category if not provided',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 'Ticket Title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Ticket details...' })
  @IsNotEmpty()
  @IsString()
  details: string;

  @ApiProperty({
    enum: TicketPriority,
    example: TicketPriority.MEDIUM,
  })
  @IsEnum(TicketPriority)
  priority: TicketPriority;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  documentIds?: string[];

  // User registration fields
  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'test@example.com' })
  @Transform(lowerCaseTransformer)
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890' })
  @IsNotEmpty()
  phoneNumber: string;
}
