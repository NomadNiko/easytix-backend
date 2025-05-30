import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '../mailer/mailer.service';
import { AllConfigType } from '../config/config.type';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class StartupNotificationService implements OnModuleInit {
  private readonly logger = new Logger(StartupNotificationService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async onModuleInit() {
    // Don't send startup emails in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      await this.sendStartupNotification();
    } catch (error) {
      this.logger.error('Failed to send startup notification email', error);
      // Don't throw - we don't want email failure to prevent server startup
    }
  }

  private async sendStartupNotification() {
    const appName = this.configService.get('app.name', { infer: true }) || 'EasyTix';
    const nodeEnv = this.configService.get('app.nodeEnv', { infer: true }) || 'production';
    const frontendDomain = this.configService.get('app.frontendDomain', {
      infer: true,
    });
    const backendDomain = this.configService.get('app.backendDomain', {
      infer: true,
    });

    const serverInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
      uptime: os.uptime(),
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
        free: Math.round(os.freemem() / 1024 / 1024) + ' MB',
      },
    };

    const templatePath = path.join(
      this.configService.getOrThrow('app.workingDirectory', {
        infer: true,
      }),
      'src',
      'mail',
      'mail-templates',
      'base-template.hbs',
    );

    const highlights = [
      { label: 'Environment', value: nodeEnv },
      { label: 'Frontend URL', value: frontendDomain },
      { label: 'Backend URL', value: backendDomain },
      { label: 'Hostname', value: serverInfo.hostname },
      { label: 'Platform', value: serverInfo.platform },
      { label: 'Node Version', value: serverInfo.nodeVersion },
      { label: 'System Uptime', value: `${Math.round(serverInfo.uptime / 60)} minutes` },
      { label: 'Memory (Total/Free)', value: `${serverInfo.memory.total} / ${serverInfo.memory.free}` },
      { label: 'Started At', value: new Date().toLocaleString() },
    ];

    await this.mailerService.sendMail({
      to: 'security@nomadsoft.us',
      subject: `[${nodeEnv.toUpperCase()}] ${appName} Server Started - ${serverInfo.hostname}`,
      text: `${appName} server has started successfully on ${serverInfo.hostname}`,
      templatePath,
      context: {
        app_name: appName,
        currentYear: new Date().getFullYear(),
        title: 'Server Started',
        subtitle: `${nodeEnv.toUpperCase()} Environment`,
        greeting: '🚀 Server Successfully Started',
        mainText: `The ${appName} server has been started successfully and is now operational.`,
        highlights,
        warningText: 'If you did not expect this server restart, please investigate immediately for potential security issues.',
        footerText: 'This is an automated security notification.',
      },
    });

    this.logger.log('Startup notification email sent to security@nomadsoft.us');
  }
}