import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SharesService } from './shares.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('shares')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get()
  async getAccount(@CurrentUser('sub') userId: string) {
    const memberId = await this.sharesService.resolveMemberId(userId);
    return this.sharesService.getAccount(memberId);
  }

  @Post('purchase')
  async purchase(@CurrentUser('sub') userId: string, @Body() dto: any) {
    const memberId = await this.sharesService.resolveMemberId(userId);
    return this.sharesService.purchase(memberId, dto);
  }

  @Get('transactions')
  async getTransactions(@CurrentUser('sub') userId: string) {
    const memberId = await this.sharesService.resolveMemberId(userId);
    return this.sharesService.getTransactions(memberId);
  }

  @Post('dividend')
  @Roles('ADMINISTRATOR')
  async declareDividend(@Body() dto: any) {
    return this.sharesService.declareDividend(dto.amountPerShare, dto.financialYear);
  }
}
