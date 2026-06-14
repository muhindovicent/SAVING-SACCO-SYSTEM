import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRATOR')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getLogs({
      page: page || 1,
      limit: limit || 50,
      userId,
      action,
      entity,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('system-events')
  async getSystemEvents(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('level') level?: string,
  ) {
    return this.auditService.getSystemEvents({
      page: page || 1,
      limit: limit || 50,
      level,
    });
  }

  @Get('statistics')
  async getStatistics() {
    return this.auditService.getStatistics();
  }
}
