import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';

export class Notification {
  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5d',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: '60a5d5d0e95b0b2d6c5c5e5a',
  })
  userId: User['id'];

  @ApiProperty({
    type: String,
    example: 'Ticket Assigned',
  })
  title: string;

  @ApiProperty({
    type: String,
    example: 'You have been assigned ticket #12345',
  })
  message: string;

  @ApiProperty({
    type: Boolean,
    example: false,
  })
  isRead: boolean;

  @ApiProperty({
    type: String,
    example: '/tickets/12345',
    required: false,
  })
  link?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
