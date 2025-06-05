import { Exclude, Expose } from 'class-transformer';
import { FileType } from '../../files/domain/file';
import { Role } from '../../roles/domain/role';
import { Status } from '../../statuses/domain/status';
import { ApiProperty } from '@nestjs/swagger';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

// <database-block>
const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;
// </database-block>

export class User {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: String,
    example: 'john.doe@example.com',
  })
  @Expose({ groups: ['me', 'admin'] })
  email: string | null;

  @Exclude({ toPlainOnly: true })
  password?: string;

  @ApiProperty({
    type: String,
    example: 'email',
  })
  @Expose({ groups: ['me', 'admin'] })
  provider: string;

  @ApiProperty({
    type: String,
    example: '1234567890',
  })
  @Expose({ groups: ['me', 'admin'] })
  socialId?: string | null;

  @ApiProperty({
    type: String,
    example: 'John',
  })
  firstName: string | null;

  @ApiProperty({
    type: String,
    example: 'Doe',
  })
  lastName: string | null;

  @ApiProperty({
    type: String,
    example: '+1234567890',
  })
  phoneNumber?: string | null;

  @ApiProperty({
    type: () => FileType,
  })
  photo?: FileType | null;

  @ApiProperty({
    type: () => Role,
  })
  role?: Role | null;

  @ApiProperty({
    type: () => Status,
  })
  status?: Status;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'User notification preferences',
    example: {
      ticketCreated: { email: true, notification: true },
      ticketAssigned: { email: true, notification: true },
      // ... other preferences
    },
  })
  notificationPreferences?: NotificationPreferences;
}

export interface NotificationPreference {
  email: boolean;
  notification: boolean;
}

export interface NotificationPreferences {
  // Ticket Events
  ticketCreated: NotificationPreference;
  ticketAssigned: NotificationPreference;
  ticketStatusChanged: NotificationPreference;
  ticketClosed: NotificationPreference;
  ticketResolved: NotificationPreference;
  ticketReopened: NotificationPreference;
  ticketDeleted: NotificationPreference;

  // Comment Events
  newComment: NotificationPreference;

  // Document Events
  documentAdded: NotificationPreference;
  documentRemoved: NotificationPreference;

  // Change Events
  priorityChanged: NotificationPreference;
  categoryChanged: NotificationPreference;

  // Queue Events
  queueAssignment: NotificationPreference;

  // Security Events
  passwordChanged: NotificationPreference;
  emailChanged: NotificationPreference;

  // System Events
  highPriorityAlert: NotificationPreference;
  systemMaintenance: NotificationPreference;
}
