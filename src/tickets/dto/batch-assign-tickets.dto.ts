import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class BatchAssignTicketsDto {
  @ApiProperty({
    description: 'Array of ticket IDs to assign',
    example: ['60a5d5d0e95b0b2d6c5c5e5a', '60a5d5d0e95b0b2d6c5c5e5b'],
  })
  @IsArray()
  @IsString({ each: true })
  ticketIds: string[];

  @ApiProperty({
    description: 'User ID to assign all tickets to',
    example: '60a5d5d0e95b0b2d6c5c5e5c',
  })
  @IsString()
  userId: string;
}
