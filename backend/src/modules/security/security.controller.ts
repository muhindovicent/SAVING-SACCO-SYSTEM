import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRATOR')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Post('encrypt')
  @HttpCode(HttpStatus.OK)
  async encryptPII(@Body('data') data: string) {
    const encrypted = await this.securityService.encryptPII(data);
    return { encrypted };
  }

  @Post('decrypt')
  @HttpCode(HttpStatus.OK)
  async decryptPII(@Body('data') data: string) {
    const decrypted = await this.securityService.decryptPII(data);
    return { decrypted };
  }

  @Post('audit-trail')
  @HttpCode(HttpStatus.CREATED)
  async generateAuditTrail(
    @Body('userId') userId: string,
    @Body('action') action: string,
    @Body('resource') resource: string,
    @Body('details') details: any,
  ) {
    await this.securityService.generateAuditTrail(userId, action, resource, details);
    return { message: 'Audit trail recorded' };
  }

  @Post('fraud-detection')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMINISTRATOR', 'TREASURER')
  async detectFraud(
    @Body('memberId') memberId: string,
    @Body('transaction') transaction: any,
  ) {
    return this.securityService.detectFraud(memberId, transaction);
  }

  @Get('ip-whitelist/:ip')
  @HttpCode(HttpStatus.OK)
  async checkIpWhitelist(@Param('ip') ip: string) {
    const whitelisted = await this.securityService.isIpWhitelisted(ip);
    return { ip, whitelisted };
  }
}
