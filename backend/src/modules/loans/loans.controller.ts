import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get('products')
  async getProducts() {
    return this.loansService.getProducts();
  }

  @Post('products')
  @Roles('ADMINISTRATOR')
  async createProduct(@Body() dto: any) {
    return this.loansService.createProduct(dto);
  }

  @Post('apply')
  async apply(@CurrentUser('sub') userId: string, @Body() dto: any) {
    const memberId = dto.memberId || await this.loansService.resolveMemberId(userId);
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
  @Roles('TREASURER', 'ADMINISTRATOR')
  async getPending(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.loansService.getPending({ page: page || 1, limit: limit || 20 });
  }

  @Get('all')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async getAllLoans(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.loansService.getAll({ page: page || 1, limit: limit || 20 });
  }

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

  @Post(':id/repay')
  async repay(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: any,
  ) {
    const memberId = await this.loansService.resolveMemberId(userId);
    return this.loansService.repay(id, memberId, dto);
  }

  @Get(':id/schedule')
  async getSchedule(@Param('id') id: string) {
    return this.loansService.getSchedule(id);
  }

  @Get('statistics')
  @Roles('TREASURER', 'ADMINISTRATOR')
  async getStatistics() {
    return this.loansService.getStatistics();
  }
}
