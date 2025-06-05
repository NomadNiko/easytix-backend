// src/mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailData } from './interfaces/mail-data.interface';
import { MailerService } from '../mailer/mailer.service';
import path from 'path';
import { AllConfigType } from '../config/config.type';
import { Ticket } from '../tickets/domain/ticket';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  private getBaseContext() {
    return {
      app_name:
        this.configService.get('app.name', { infer: true }) || 'EasyTix',
      currentYear: new Date().getFullYear(),
    };
  }

  private getTemplatePath(templateName: string): string {
    return path.join(
      this.configService.getOrThrow('app.workingDirectory', {
        infer: true,
      }),
      'src',
      'mail',
      'mail-templates',
      templateName,
    );
  }

  // 1. User Sign-Up Confirmation
  async userSignUp(mailData: MailData<{ hash: string }>): Promise<void> {
    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/confirm-email',
    );
    url.searchParams.set('hash', mailData.data.hash);

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: '🎉 Welcome to EasyTix - Please Confirm Your Email',
      text: `Welcome to EasyTix! Please confirm your email by visiting: ${url.toString()}`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Confirm Your Email',
        subtitle: 'One more step to get started',
        greeting: 'Welcome aboard! 🚀',
        mainText:
          "We're thrilled to have you join EasyTix. To get started and ensure the security of your account, please confirm your email address.",
        actionUrl: url.toString(),
        actionTitle: 'Confirm Email Address',
        secondaryText:
          "Once confirmed, you'll have full access to submit and track support tickets, manage your profile, and more.",
        warningText:
          "This link will expire in 24 hours. If you didn't create an account, please ignore this email.",
      },
    });
  }

  // 2. Forgot Password
  async forgotPassword(
    mailData: MailData<{ hash: string; tokenExpires: number }>,
  ): Promise<void> {
    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/password-change',
    );
    url.searchParams.set('hash', mailData.data.hash);
    url.searchParams.set('expires', mailData.data.tokenExpires.toString());

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: '🔐 Reset Your Password',
      text: `Reset your password by visiting: ${url.toString()}`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Reset Your Password',
        subtitle: 'Password recovery request',
        greeting: 'Need to reset your password?',
        mainText:
          'We received a request to reset your password. Click the button below to create a new password.',
        actionUrl: url.toString(),
        actionTitle: 'Reset Password',
        secondaryText:
          'For security reasons, this link will expire in 30 minutes.',
        warningText:
          "If you didn't request a password reset, please ignore this email. Your password won't be changed.",
      },
    });
  }

  // 3. Confirm New Email
  async confirmNewEmail(mailData: MailData<{ hash: string }>): Promise<void> {
    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/confirm-new-email',
    );
    url.searchParams.set('hash', mailData.data.hash);

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: '📧 Confirm Your New Email Address',
      text: `Confirm your new email address by visiting: ${url.toString()}`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Confirm Email Change',
        subtitle: 'Verify your new email address',
        greeting: 'Email change requested',
        mainText:
          "You've requested to change your email address. Please confirm this new email address to complete the change.",
        actionUrl: url.toString(),
        actionTitle: 'Confirm New Email',
        secondaryText:
          "After confirmation, you'll need to use this new email address to sign in.",
        warningText:
          "If you didn't request this change, please contact support immediately.",
      },
    });
  }

  // 4. Welcome Email (Public Ticket)
  async welcomePublicTicket(
    mailData: MailData<{
      firstName: string;
      password: string;
      ticketId: string;
    }>,
  ): Promise<void> {
    const signInUrl =
      this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
      '/sign-in';

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: '🎟️ Welcome to EasyTix - Account Created',
      text: `Welcome ${mailData.data.firstName}! Your account has been created. Your password is: ${mailData.data.password}`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Welcome to EasyTix',
        subtitle: 'Your account has been created',
        greeting: `Hello ${mailData.data.firstName}! 👋`,
        mainText:
          'An account has been automatically created for you while submitting your support ticket. You can now track your ticket status and communicate with our support team.',
        highlights: [
          { label: 'Email', value: mailData.to },
          { label: 'Temporary Password', value: mailData.data.password },
          { label: 'Ticket ID', value: mailData.data.ticketId },
        ],
        actionUrl: signInUrl,
        actionTitle: 'Sign In to Your Account',
        secondaryText:
          'For security, please change your password after your first login.',
        warningText:
          'Keep this email safe as it contains your login credentials.',
      },
    });
  }

  // 5. Ticket Created (Public/Existing User)
  async ticketCreated(
    mailData: MailData<{
      firstName: string;
      ticket: Ticket;
      isPublic?: boolean;
    }>,
  ): Promise<void> {
    const ticketUrl =
      this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
      `/tickets/${mailData.data.ticket.id}`;

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: `🎫 Ticket Created: ${mailData.data.ticket.title}`,
      text: `Your ticket "${mailData.data.ticket.title}" has been created successfully.`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Ticket Created Successfully',
        subtitle: `Ticket #${mailData.data.ticket.id}`,
        greeting: `Hello ${mailData.data.firstName}!`,
        mainText:
          'Your support ticket has been created successfully. Our team will review it and respond as soon as possible.',
        highlights: [
          { label: 'Ticket ID', value: mailData.data.ticket.id },
          { label: 'Title', value: mailData.data.ticket.title },
          { label: 'Priority', value: mailData.data.ticket.priority },
          { label: 'Status', value: mailData.data.ticket.status },
        ],
        actionUrl: ticketUrl,
        actionTitle: 'View Your Ticket',
        secondaryText:
          "You'll receive email notifications for any updates on this ticket.",
      },
    });
  }

  // 6. Server Startup Notification (already exists in startup-notification.service.ts)

  // 7. Ticket Assigned to Agent
  async ticketAssigned(
    mailData: MailData<{
      agentName: string;
      ticket: Ticket;
      userName: string;
    }>,
  ): Promise<void> {
    const ticketUrl =
      this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
      `/tickets/${mailData.data.ticket.id}`;

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: `👤 Ticket Assigned: ${mailData.data.ticket.title}`,
      text: `Your ticket has been assigned to ${mailData.data.agentName}.`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Ticket Assigned to Agent',
        subtitle: `Ticket #${mailData.data.ticket.id}`,
        greeting: `Hello ${mailData.data.userName}!`,
        mainText: `Good news! Your support ticket has been assigned to ${mailData.data.agentName}, who will be helping you resolve your issue.`,
        highlights: [
          { label: 'Assigned Agent', value: mailData.data.agentName },
          { label: 'Ticket', value: mailData.data.ticket.title },
          { label: 'Priority', value: mailData.data.ticket.priority },
        ],
        actionUrl: ticketUrl,
        actionTitle: 'View Ticket Details',
        secondaryText:
          'You can expect a response within our standard support timeframe.',
      },
    });
  }

  // 8. Ticket Status Changed
  async ticketStatusChanged(
    mailData: MailData<{
      ticket: Ticket;
      oldStatus: string;
      newStatus: string;
      userName: string;
    }>,
  ): Promise<void> {
    const ticketUrl =
      this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
      `/tickets/${mailData.data.ticket.id}`;

    const statusEmoji: { [key: string]: string } = {
      Opened: '🔵',
      'In Progress': '🟡',
      Resolved: '🟢',
      Closed: '⚫',
    };

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: `${statusEmoji[mailData.data.newStatus] || '📋'} Ticket Status Update: ${mailData.data.ticket.title}`,
      text: `Your ticket status has changed from ${mailData.data.oldStatus} to ${mailData.data.newStatus}.`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Ticket Status Updated',
        subtitle: `Ticket #${mailData.data.ticket.id}`,
        greeting: `Hello ${mailData.data.userName}!`,
        mainText: `The status of your support ticket has been updated.`,
        highlights: [
          { label: 'Previous Status', value: mailData.data.oldStatus },
          { label: 'New Status', value: mailData.data.newStatus },
          { label: 'Ticket', value: mailData.data.ticket.title },
        ],
        actionUrl: ticketUrl,
        actionTitle: 'View Ticket',
        secondaryText: this.getStatusMessage(mailData.data.newStatus),
      },
    });
  }

  // 9. New Comment on Ticket
  async newComment(
    mailData: MailData<{
      ticket: Ticket;
      commentAuthor: string;
      commentPreview: string;
      userName: string;
    }>,
  ): Promise<void> {
    const ticketUrl =
      this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
      `/tickets/${mailData.data.ticket.id}`;

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: `💬 New Comment: ${mailData.data.ticket.title}`,
      text: `${mailData.data.commentAuthor} commented on your ticket.`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'New Comment on Your Ticket',
        subtitle: `Ticket #${mailData.data.ticket.id}`,
        greeting: `Hello ${mailData.data.userName}!`,
        mainText: `${mailData.data.commentAuthor} has added a comment to your support ticket.`,
        highlights: [
          { label: 'Comment Preview', value: mailData.data.commentPreview },
        ],
        actionUrl: ticketUrl,
        actionTitle: 'View Full Comment',
        secondaryText:
          'Reply to keep the conversation going and help us resolve your issue faster.',
      },
    });
  }

  // 10. Ticket Resolution
  async ticketResolved(
    mailData: MailData<{
      ticket: Ticket;
      userName: string;
      resolutionSummary?: string;
    }>,
  ): Promise<void> {
    const ticketUrl =
      this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
      `/tickets/${mailData.data.ticket.id}`;

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: `✅ Resolved: ${mailData.data.ticket.title}`,
      text: `Great news! Your ticket has been resolved.`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Ticket Resolved! 🎉',
        subtitle: `Ticket #${mailData.data.ticket.id}`,
        greeting: `Hello ${mailData.data.userName}!`,
        mainText:
          'Great news! Your support ticket has been marked as resolved. We hope we were able to help you effectively.',
        highlights: [
          { label: 'Ticket', value: mailData.data.ticket.title },
          { label: 'Status', value: 'Resolved ✅' },
          ...(mailData.data.resolutionSummary
            ? [{ label: 'Resolution', value: mailData.data.resolutionSummary }]
            : []),
        ],
        actionUrl: ticketUrl,
        actionTitle: 'View Resolution Details',
        secondaryText:
          'If you need further assistance or the issue persists, you can reopen this ticket or create a new one.',
        warningText:
          'This ticket will be automatically closed after 7 days if no further action is taken.',
      },
    });
  }

  // 11. Ticket Closed
  async ticketClosed(
    mailData: MailData<{
      ticket: Ticket;
      userName: string;
      closingNotes?: string;
    }>,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: mailData.to,
      subject: `📁 Closed: ${mailData.data.ticket.title}`,
      text: `Your ticket has been closed.`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Ticket Closed',
        subtitle: `Ticket #${mailData.data.ticket.id}`,
        greeting: `Hello ${mailData.data.userName}!`,
        mainText:
          'Your support ticket has been closed. Thank you for using EasyTix support.',
        highlights: [
          { label: 'Ticket', value: mailData.data.ticket.title },
          { label: 'Status', value: 'Closed' },
          ...(mailData.data.closingNotes
            ? [{ label: 'Closing Notes', value: mailData.data.closingNotes }]
            : []),
        ],
        actionUrl:
          this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
          '/submit-ticket',
        actionTitle: 'Create New Ticket',
        secondaryText:
          'If you need help with a similar or new issue, please create a new support ticket.',
        footerText:
          'We appreciate your feedback. How was your support experience?',
      },
    });
  }

  // 12. Ticket Priority Changed
  async ticketPriorityChanged(
    mailData: MailData<{
      ticket: Ticket;
      oldPriority: string;
      newPriority: string;
      userName: string;
    }>,
  ): Promise<void> {
    const ticketUrl =
      this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
      `/tickets/${mailData.data.ticket.id}`;

    const priorityEmoji: { [key: string]: string } = {
      Low: '🟢',
      Medium: '🟡',
      High: '🟠',
      Urgent: '🔴',
    };

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: `${priorityEmoji[mailData.data.newPriority] || '⚡'} Priority Updated: ${mailData.data.ticket.title}`,
      text: `Your ticket priority has been changed from ${mailData.data.oldPriority} to ${mailData.data.newPriority}.`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Ticket Priority Updated',
        subtitle: `Ticket #${mailData.data.ticket.id}`,
        greeting: `Hello ${mailData.data.userName}!`,
        mainText: 'The priority level of your support ticket has been updated.',
        highlights: [
          {
            label: 'Previous Priority',
            value: `${priorityEmoji[mailData.data.oldPriority] || ''} ${mailData.data.oldPriority}`,
          },
          {
            label: 'New Priority',
            value: `${priorityEmoji[mailData.data.newPriority] || ''} ${mailData.data.newPriority}`,
          },
          { label: 'Ticket', value: mailData.data.ticket.title },
        ],
        actionUrl: ticketUrl,
        actionTitle: 'View Ticket',
        secondaryText: this.getPriorityMessage(mailData.data.newPriority),
      },
    });
  }

  // 13. Password Changed Successfully
  async passwordChanged(
    mailData: MailData<{
      userName: string;
      changedAt: Date;
      ipAddress?: string;
    }>,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: mailData.to,
      subject: '🔒 Password Changed Successfully',
      text: 'Your password has been changed successfully.',
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Password Changed',
        subtitle: 'Security notification',
        greeting: `Hello ${mailData.data.userName}!`,
        mainText:
          'Your password has been successfully changed. Your account is now secured with the new password.',
        highlights: [
          {
            label: 'Changed At',
            value: mailData.data.changedAt.toLocaleString(),
          },
          ...(mailData.data.ipAddress
            ? [{ label: 'IP Address', value: mailData.data.ipAddress }]
            : []),
        ],
        actionUrl:
          this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
          '/sign-in',
        actionTitle: 'Sign In',
        warningText:
          "If you didn't make this change, please contact support immediately and reset your password.",
      },
    });
  }

  // 15. High Priority Ticket Alert (for queue users and security)
  async highPriorityTicketAlert(
    mailData: MailData<{
      ticket: Ticket;
      submittedBy: string;
      recipientName?: string;
    }>,
  ): Promise<void> {
    const ticketUrl =
      this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
      `/tickets/${mailData.data.ticket.id}`;

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: `🚨 High Priority Ticket: ${mailData.data.ticket.title}`,
      text: `A high priority ticket requires immediate attention.`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: '⚠️ High Priority Ticket Alert',
        subtitle: 'Immediate attention required',
        greeting: mailData.data.recipientName
          ? `Hello ${mailData.data.recipientName}!`
          : 'Team Alert!',
        mainText:
          'A high priority support ticket has been submitted and requires immediate attention.',
        highlights: [
          { label: 'Ticket ID', value: mailData.data.ticket.id },
          { label: 'Title', value: mailData.data.ticket.title },
          { label: 'Priority', value: '🔴 ' + mailData.data.ticket.priority },
          { label: 'Submitted By', value: mailData.data.submittedBy },
          { label: 'Created', value: new Date().toLocaleString() },
        ],
        actionUrl: ticketUrl,
        actionTitle: 'View Ticket Now',
        warningText:
          'This is a high priority ticket. Please review and assign to an agent as soon as possible.',
      },
    });
  }

  // 16. Queue Assignment Alert
  async queueAssignment(
    mailData: MailData<{
      userName: string;
      queueName: string;
      action: 'added' | 'removed';
    }>,
  ): Promise<void> {
    const isAdded = mailData.data.action === 'added';

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: `${isAdded ? '➕' : '➖'} Queue Assignment Update`,
      text: `You have been ${mailData.data.action} ${isAdded ? 'to' : 'from'} the ${mailData.data.queueName} queue.`,
      templatePath: this.getTemplatePath('base-template.hbs'),
      context: {
        ...this.getBaseContext(),
        title: 'Queue Assignment Update',
        subtitle: isAdded ? 'Added to queue' : 'Removed from queue',
        greeting: `Hello ${mailData.data.userName}!`,
        mainText: isAdded
          ? `You have been added to the "${mailData.data.queueName}" support queue. You will now receive tickets assigned to this queue.`
          : `You have been removed from the "${mailData.data.queueName}" support queue. You will no longer receive tickets from this queue.`,
        highlights: [
          { label: 'Queue', value: mailData.data.queueName },
          {
            label: 'Action',
            value: isAdded ? 'Added to queue ✅' : 'Removed from queue ❌',
          },
          { label: 'Effective', value: 'Immediately' },
        ],
        actionUrl:
          this.configService.getOrThrow('app.frontendDomain', { infer: true }) +
          '/tickets',
        actionTitle: isAdded ? 'View Queue Tickets' : 'View Dashboard',
        secondaryText: isAdded
          ? 'You will receive notifications for new tickets assigned to this queue.'
          : 'Thank you for your contributions to this queue.',
      },
    });
  }

  // Helper methods
  private getStatusMessage(status: string): string {
    const messages: { [key: string]: string } = {
      Opened: 'Your ticket is now open and waiting to be assigned to an agent.',
      'In Progress': 'An agent is actively working on your ticket.',
      Resolved:
        'Your issue has been resolved. The ticket will remain open for 7 days in case you need further assistance.',
      Closed:
        'This ticket has been closed. If you need further help, please create a new ticket.',
    };
    return messages[status] || 'Your ticket status has been updated.';
  }

  private getPriorityMessage(priority: string): string {
    const messages: { [key: string]: string } = {
      Low: 'Your ticket will be addressed during normal support hours.',
      Medium:
        'Your ticket will be prioritized appropriately within our support queue.',
      High: 'Your ticket has been marked as high priority and will receive expedited attention.',
      Urgent:
        'Your ticket is marked as urgent and will receive immediate attention from our support team.',
    };
    return messages[priority] || 'Your ticket priority has been updated.';
  }
}
