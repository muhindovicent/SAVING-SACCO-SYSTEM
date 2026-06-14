import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SavingsService } from './savings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('savings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get('products')
  async getProducts() {
    return this.savingsService.getProducts();
  }

  @Post('products')
  @Roles('ADMINISTRATOR')
  async createProduct(@Body() dto: any) {
    return this.savingsService.createProduct(dto);
  }

  @Get('accounts')
  async getAccounts(
    @CurrentUser('sub') userId: string,
    @Query('memberId') memberId?: string,
  ) {
    const mId = memberId || await this.savingsService.resolveMemberId(userId);
    return this.savingsService.getAccounts(mId);
  }

  @Post('accounts')
  async openAccount(@CurrentUser('sub') userId: string, @Body() dto: any) {
    const memberId = dto.memberId || await this.savingsService.resolveMemberId(userId);
    return this.savingsService.openAccount(memberId, dto.productId);
  }

  @Post('deposit')
  async deposit(@CurrentUser('sub') userId: string, @Body() dto: any) {
    const memberId = dto.memberId || await this.savingsService.resolveMemberId(userId);
    return this.savingsService.deposit(memberId, dto);
  }

  @Post('withdraw')
  async withdraw(@CurrentUser('sub') userId: string, @Body() dto: any) {
    const memberId = dto.memberId || await this.savingsService.resolveMemberId(userId);
    return this.savingsService.withdraw(memberId, dto);
  }

  @Get('goals')
  async getGoals(@CurrentUser('sub') userId: string) {
    const memberId = await this.savingsService.resolveMemberId(userId);
    return this.savingsService.getGoals(memberId);
  }

  @Post('goals')
  async createGoal(@CurrentUser('sub') userId: string, @Body() dto: any) {
    const memberId = await this.savingsService.resolveMemberId(userId);
    return this.savingsService.createGoal(memberId, dto);
  }

  @Post('goals/:id/contribute')
  async contributeToGoal(
    @CurrentUser('sub') userId: string,
    @Param('id') goalId: string,
    @Body('amount') amount: number,
  ) {
    const memberId = await this.savingsService.resolveMemberId(userId);
    return this.savingsService.contributeToGoal(memberId, goalId, amount);
  }

  @Get('transactions')
  async getTransactions(
    @CurrentUser('sub') userId: string,
    @Query('memberId') memberId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const mId = memberId || await this.savingsService.resolveMemberId(userId);
    return this.savingsService.getTransactions(mId, { page: page || 1, limit: limit || 20 });
  }
}
