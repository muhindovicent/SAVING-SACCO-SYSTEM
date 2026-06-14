import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { TreasuryService } from './treasury.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('treasury')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TREASURER', 'ADMINISTRATOR')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.treasuryService.getDashboard();
  }

  @Get('cash-position')
  async getCashPosition() {
    return this.treasuryService.getCashPosition();
  }

  @Get('pending-disbursements')
  async getPendingDisbursements() {
    return this.treasuryService.getPendingDisbursements();
  }

  @Get('collections')
  async getCollections() {
    return this.treasuryService.getCollections();
  }

  @Get('transactions')
  async getTransactions() {
    return this.treasuryService.getRecentTransactions();
  }

  @Post('reconcile')
  async reconcile(@Body() dto: any) {
    return this.treasuryService.reconcile(dto);
  }
}
