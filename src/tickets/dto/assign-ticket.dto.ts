import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignTicketDto {
  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5c',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
