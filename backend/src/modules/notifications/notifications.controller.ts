import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRATOR', 'TREASURER')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('email')
  @HttpCode(HttpStatus.OK)
  async sendEmail(@Body() dto: { to: string; subject: string; body: string }) {
    await this.notificationsService.sendEmail(dto.to, dto.subject, dto.body);
    return { message: 'Email queued for delivery' };
  }

  @Post('sms')
  @HttpCode(HttpStatus.OK)
  async sendSms(@Body() dto: { phone: string; message: string }) {
    await this.notificationsService.sendSms(dto.phone, dto.message);
    return { message: 'SMS queued for delivery' };
  }

  @Post('loan-approved')
  @HttpCode(HttpStatus.OK)
  async sendLoanApproved(@Body() dto: { memberPhone: string; amount: number; applicationNo: string }) {
    await this.notificationsService.sendLoanApproved(dto.memberPhone, dto.amount, dto.applicationNo);
    return { message: 'Loan approval notification queued' };
  }

  @Post('deposit-confirmation')
  @HttpCode(HttpStatus.OK)
  async sendDepositConfirmation(@Body() dto: { memberPhone: string; amount: number; accountNumber: string }) {
    await this.notificationsService.sendDepositConfirmation(dto.memberPhone, dto.amount, dto.accountNumber);
    return { message: 'Deposit confirmation queued' };
  }

  @Post('dividend')
  @HttpCode(HttpStatus.OK)
  async sendDividendNotification(@Body() dto: { memberPhone: string; amount: number; financialYear: string }) {
    await this.notificationsService.sendDividendNotification(dto.memberPhone, dto.amount, dto.financialYear);
    return { message: 'Dividend notification queued' };
  }
}
