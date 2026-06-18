import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateLoanProductDto, UpdateLoanProductDto } from './dto/create-loan-product.dto';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { RepayLoanDto } from './dto/repay-loan.dto';
import { CalculateLoanDto } from './dto/calculate-loan.dto';

@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  // ── Loan Products ──

  @Get('products')
  async getProducts() {
    return this.loansService.getProducts();
  }

  @Get('products/all')
  @Roles('ADMINISTRATOR', 'TREASURER')
  async getAllProducts() {
    return this.loansService.getAllProducts();
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    return this.loansService.getProduct(id);
  }

  @Post('products')
  @Roles('ADMINISTRATOR')
  async createProduct(@Body() dto: CreateLoanProductDto) {
    return this.loansService.createProduct(dto);
  }

  @Patch('products/:id')
  @Roles('ADMINISTRATOR')
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateLoanProductDto) {
    return this.loansService.updateProduct(id, dto);
  }

  @Patch('products/:id/toggle')
  @Roles('ADMINISTRATOR')
  async toggleProduct(@Param('id') id: string) {
    return this.loansService.toggleProduct(id);
  }

  // ── Calculation Engine ──

  @Post('calculate')
  async calculateLoan(@Body() dto: CalculateLoanDto) {
    return this.loansService.calculateLoan(
      dto.principal,
      dto.interestRate,
      dto.durationMonths,
      dto.interestMethod || 'FLAT',
      dto.processingFee || 0,
    );
  }

  @Get('interest-methods')
  async getInterestMethods() {
    return this.loansService.getInterestMethods();
  }

  // ── Loan Applications ──

  @Post('apply')
  async apply(@CurrentUser('sub') userId: string, @Body() dto: ApplyLoanDto) {
    const memberId = dto['memberId'] || await this.loansService.resolveMemberId(userId);
    return this.loansService.apply(memberId, dto);
  }

  @Get('applications')
  async getApplications(
    @CurrentUser('sub') userId: string,
    @Query('memberId') memberId?: string,
    @Query('status') status?: string,
  ) {
    const mId = memberId || await this.loansService.resolveMemberId(userId);
    return this.loansService.getApplications(mId, status);
  }

  @Get('pending')
  @Roles('TREASURER', 'ADMINISTRATOR', 'LOAN_OFFICER')
  async getPending(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.loansService.getPending({ page: page || 1, limit: limit || 20 });
  }

  @Get('all')
  @Roles('TREASURER', 'ADMINISTRATOR', 'LOAN_OFFICER')
  async getAllLoans(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.loansService.getAll({ page: page || 1, limit: limit || 20 });
  }

  // ── Approval Workflow ──

  @Patch(':id/approve')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.loansService.approve(id, userId);
  }

  @Patch(':id/reject')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.loansService.reject(id, reason);
  }

  @Post(':id/disburse')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async disburse(@Param('id') id: string) {
    return this.loansService.disburse(id);
  }

  // ── Active Loans ──

  @Get('active')
  @Roles('TREASURER', 'ADMINISTRATOR', 'LOAN_OFFICER')
  async getActiveLoans(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.loansService.getActiveLoans({ page: page || 1, limit: limit || 20 });
  }

  @Get('overdue')
  @Roles('TREASURER', 'ADMINISTRATOR', 'LOAN_OFFICER')
  async getOverdueLoans(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.loansService.getOverdueLoans({ page: page || 1, limit: limit || 20 });
  }

  // ── Repayment ──

  @Post(':id/repay')
  async repay(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: RepayLoanDto,
  ) {
    const memberId = await this.loansService.resolveMemberId(userId);
    return this.loansService.repay(id, memberId, dto);
  }

  // ── Schedule ──

  @Get(':id/schedule')
  async getSchedule(@Param('id') id: string) {
    return this.loansService.getSchedule(id);
  }

  // ── Early Repayment ──

  @Post(':id/early-repayment')
  async earlyRepayment(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body('amount') amount: number,
  ) {
    const memberId = await this.loansService.resolveMemberId(userId);
    return this.loansService.earlyRepayment(id, memberId, amount);
  }

  // ── Penalties ──

  @Get('penalties')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async getPenalties(@Query('loanId') loanId?: string) {
    return this.loansService.getPenalties(loanId);
  }

  @Post('penalties/:id/waive')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async waivePenalty(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.loansService.waivePenalty(id, userId);
  }

  @Post('calculate-penalties')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async calculateOverduePenalties() {
    return this.loansService.calculateOverduePenalties();
  }

  // ── Dashboard Statistics ──

  @Get('statistics')
  @Roles('TREASURER', 'ADMINISTRATOR', 'LOAN_OFFICER')
  async getStatistics() {
    return this.loansService.getStatistics();
  }

  @Get('officer-statistics')
  @Roles('LOAN_OFFICER', 'TREASURER', 'ADMINISTRATOR')
  async getOfficerStatistics() {
    return this.loansService.getOfficerStatistics();
  }

  @Get('member-statistics')
  async getMemberStatistics(@CurrentUser('sub') userId: string) {
    const memberId = await this.loansService.resolveMemberId(userId);
    return this.loansService.getMemberStatistics(memberId);
  }

  @Get('overview')
  @Roles('TREASURER', 'ADMINISTRATOR', 'LOAN_OFFICER')
  async getOverview() {
    return this.loansService.getOverview();
  }

  // ── Reports ──

  @Get('reports/portfolio')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async getPortfolioReport(@Query('format') format?: string) {
    return this.loansService.getPortfolioReport(format || 'json');
  }

  @Get('reports/interest-revenue')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async getInterestRevenueReport(@Query('format') format?: string) {
    return this.loansService.getInterestRevenueReport(format || 'json');
  }

  @Get('reports/outstanding')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async getOutstandingReport(@Query('format') format?: string) {
    return this.loansService.getOutstandingReport(format || 'json');
  }

  @Get('reports/overdue')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async getOverdueReport(@Query('format') format?: string) {
    return this.loansService.getOverdueReport(format || 'json');
  }

  @Get('reports/product-performance')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async getProductPerformanceReport(@Query('format') format?: string) {
    return this.loansService.getProductPerformanceReport(format || 'json');
  }

  @Get('reports/recovery')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async getRecoveryReport(@Query('format') format?: string) {
    return this.loansService.getRecoveryReport(format || 'json');
  }
}
