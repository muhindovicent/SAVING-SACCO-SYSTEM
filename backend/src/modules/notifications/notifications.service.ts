import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../../infrastructure/queue/queue.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly queue: QueueService,
  ) {
    this.queue.consume('notifications.email', async (msg) => {
      this.logger.log(`Sending email: ${JSON.stringify(msg)}`);
      // Integrate with email provider (SendGrid, Mailgun, etc.)
    });

    this.queue.consume('notifications.sms', async (msg) => {
      this.logger.log(`Sending SMS: ${JSON.stringify(msg)}`);
      // Integrate with SMS provider (Twilio, Africa's Talking, etc.)
    });
  }

  async sendEmail(to: string, subject: string, body: string) {
    await this.queue.publish('notifications.email', { to, subject, body, timestamp: new Date() });
  }

  async sendSms(phone: string, message: string) {
    await this.queue.publish('notifications.sms', { phone, message, timestamp: new Date() });
  }

  async sendLoanApproved(memberPhone: string, amount: number, applicationNo: string) {
    await this.sendSms(memberPhone, `Your loan of ${amount} (${applicationNo}) has been approved.`);
  }

  async sendDepositConfirmation(memberPhone: string, amount: number, accountNumber: string) {
    await this.sendSms(memberPhone, `Deposit of ${amount} to account ${accountNumber} confirmed.`);
  }

  async sendDividendNotification(memberPhone: string, amount: number, financialYear: string) {
    await this.sendSms(memberPhone, `Dividend of ${amount} for FY ${financialYear} has been declared.`);
  }
}
