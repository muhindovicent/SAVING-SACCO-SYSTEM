import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { GovernanceService } from './governance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('governance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRATOR', 'BOARD_MEMBER')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get('meetings')
  async getMeetings() {
    return this.governanceService.getMeetings();
  }

  @Post('meetings')
  async createMeeting(@Body() dto: any) {
    return this.governanceService.createMeeting(dto);
  }

  @Patch('meetings/:id')
  async updateMeeting(@Param('id') id: string, @Body() dto: any) {
    return this.governanceService.updateMeeting(id, dto);
  }

  @Get('meetings/:id')
  async getMeeting(@Param('id') id: string) {
    return this.governanceService.getMeeting(id);
  }

  @Post('resolutions')
  async createResolution(@Body() dto: any) {
    return this.governanceService.createResolution(dto);
  }

  @Post('resolutions/:id/vote')
  async vote(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body('vote') vote: string,
  ) {
    return this.governanceService.vote(id, userId, vote);
  }
}
