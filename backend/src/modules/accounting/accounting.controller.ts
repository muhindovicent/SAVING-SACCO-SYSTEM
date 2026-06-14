import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRATOR', 'TREASURER')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('chart-of-accounts')
  async getChartOfAccounts() {
    return this.accountingService.getChartOfAccounts();
  }

  @Post('chart-of-accounts')
  @Roles('ADMINISTRATOR')
  async createAccount(@Body() dto: any) {
    return this.accountingService.createAccount(dto);
  }

  @Get('journal-entries')
  async getJournalEntries(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('source') source?: string,
  ) {
    return this.accountingService.getJournalEntries({ page: page || 1, limit: limit || 20, source });
  }

  @Post('journal-entries')
  async createJournalEntry(@Body() dto: any) {
    return this.accountingService.createJournalEntry(dto);
  }

  @Get('journal-entries/:id')
  async getJournalEntry(@Param('id') id: string) {
    return this.accountingService.getJournalEntry(id);
  }

  @Get('general-ledger')
  async getGeneralLedger(
    @Query('accountCode') accountCode?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.accountingService.getGeneralLedger({
      accountCode,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('trial-balance')
  async getTrialBalance(@Query('asAt') asAt?: string) {
    return this.accountingService.getTrialBalance(asAt ? new Date(asAt) : new Date());
  }

  @Get('income-statement')
  async getIncomeStatement(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), 0, 1);
    return this.accountingService.getIncomeStatement(start, end);
  }

  @Get('balance-sheet')
  async getBalanceSheet(@Query('asAt') asAt?: string) {
    return this.accountingService.getBalanceSheet(asAt ? new Date(asAt) : new Date());
  }

  @Post('periods')
  @Roles('ADMINISTRATOR')
  async createFinancialPeriod(@Body() dto: any) {
    return this.accountingService.createFinancialPeriod(dto);
  }

  @Post('periods/:id/close')
  @Roles('ADMINISTRATOR')
  async closePeriod(@Param('id') id: string) {
    return this.accountingService.closePeriod(id);
  }
}
