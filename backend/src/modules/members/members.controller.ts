import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.membersService.findAll({ page: page || 1, limit: limit || 20 });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.membersService.findById(id);
  }

  @Get('number/:memberNumber')
  async findByMemberNumber(@Param('memberNumber') memberNumber: string) {
    return this.membersService.findByMemberNumber(memberNumber);
  }

  @Post()
  @Roles('ADMINISTRATOR')
  async create(@Body() dto: any) {
    return this.membersService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRATOR')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.membersService.update(id, dto);
  }

  @Post(':id/activate')
  @Roles('ADMINISTRATOR')
  async activate(@Param('id') id: string) {
    return this.membersService.activate(id);
  }

  @Post(':id/deactivate')
  @Roles('ADMINISTRATOR')
  async deactivate(@Param('id') id: string) {
    return this.membersService.deactivate(id);
  }

  @Get('dashboard/profile')
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.membersService.getProfile(userId);
  }
}
