// src/mailer/mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import fs from 'node:fs/promises';
import Handlebars from 'handlebars';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class MailerService {
  private readonly resend: Resend;
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const apiKey = process.env.RESEND_API_KEY || '';
    this.resend = new Resend(apiKey);
  }

  async sendMail({
    templatePath,
    context,
    ...mailOptions
  }: {
    templatePath: string;
    context: Record<string, unknown>;
    to: string;
    from?: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<void> {
    try {
      let html: string | undefined = mailOptions.html;

      if (templatePath && !html) {
        const template = await fs.readFile(templatePath, 'utf-8');
        html = Handlebars.compile(template, {
          strict: true,
        })(context);
      }

      const fromEmail =
        mailOptions.from ||
        `"${this.configService.get('mail.defaultName', { infer: true })}" <${this.configService.get(
          'mail.defaultEmail',
          { infer: true },
        )}>`;

      // Use a basic HTML email as a fallback for the react property requirement
      // This satisfies the Resend SDK v1.0.0+ requirement
      await this.resend.emails.send({
        from: fromEmail,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: html || '<div>Email content</div>',
        text: mailOptions.text || '',
        react: html
          ? undefined
          : // Simple React component as a fallback
            {
              component: '<div>Email content</div>' as any,
              props: {},
            },
      });
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }
}
