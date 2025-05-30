import { Module } from '@nestjs/common';
import { StartupNotificationService } from './startup-notification.service';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [MailerModule],
  providers: [StartupNotificationService],
  exports: [StartupNotificationService],
})
export class StartupNotificationModule {}