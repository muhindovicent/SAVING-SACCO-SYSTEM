import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRATOR', 'TREASURER', 'AUDITOR')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('member-summary')
  async getMemberSummary() {
    return this.reportsService.getMemberSummary();
  }

  @Get('savings-summary')
  async getSavingsSummary() {
    return this.reportsService.getSavingsSummary();
  }

  @Get('loan-portfolio')
  async getLoanPortfolio(@Query('status') status?: string) {
    return this.reportsService.getLoanPortfolio(status);
  }

  @Get('aging')
  async getAgingAnalysis() {
    return this.reportsService.getAgingAnalysis();
  }

  @Get('financial')
  async getFinancialReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getFinancialReport(
      new Date(startDate), new Date(endDate),
    );
  }
}
