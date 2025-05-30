import { Injectable } from '@nestjs/common';
import { UserReadService } from './user-read.service';
import { NotificationPreferences } from '../domain/user';

export type NotificationEventType = 
  | 'ticketCreated'
  | 'ticketAssigned'
  | 'ticketStatusChanged'
  | 'ticketClosed'
  | 'ticketResolved'
  | 'ticketReopened'
  | 'ticketDeleted'
  | 'newComment'
  | 'documentAdded'
  | 'documentRemoved'
  | 'priorityChanged'
  | 'categoryChanged'
  | 'queueAssignment'
  | 'passwordChanged'
  | 'emailChanged'
  | 'highPriorityAlert'
  | 'systemMaintenance';

@Injectable()
export class NotificationPreferenceService {
  constructor(private readonly userReadService: UserReadService) {}

  async shouldSendEmail(userId: string, eventType: NotificationEventType): Promise<boolean> {
    try {
      const user = await this.userReadService.findById(userId);
      if (!user?.notificationPreferences) {
        return true; // Default to sending if no preferences set
      }

      const preference = user.notificationPreferences[eventType];
      return preference?.email !== false;
    } catch (error) {
      // If we can't get preferences, default to sending
      return true;
    }
  }

  async shouldSendNotification(userId: string, eventType: NotificationEventType): Promise<boolean> {
    try {
      const user = await this.userReadService.findById(userId);
      if (!user?.notificationPreferences) {
        return true; // Default to sending if no preferences set
      }

      const preference = user.notificationPreferences[eventType];
      return preference?.notification !== false;
    } catch (error) {
      // If we can't get preferences, default to sending
      return true;
    }
  }

  async getEmailRecipients(userIds: string[], eventType: NotificationEventType): Promise<string[]> {
    const emailRecipients: string[] = [];
    
    for (const userId of userIds) {
      if (await this.shouldSendEmail(userId, eventType)) {
        const user = await this.userReadService.findById(userId);
        if (user?.email) {
          emailRecipients.push(user.email);
        }
      }
    }
    
    return emailRecipients;
  }

  async getNotificationRecipients(userIds: string[], eventType: NotificationEventType): Promise<string[]> {
    const notificationRecipients: string[] = [];
    
    for (const userId of userIds) {
      if (await this.shouldSendNotification(userId, eventType)) {
        notificationRecipients.push(userId);
      }
    }
    
    return notificationRecipients;
  }
}