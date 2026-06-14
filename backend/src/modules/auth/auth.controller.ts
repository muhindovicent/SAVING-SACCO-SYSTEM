import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/roles.decorator';
import { ThrottleGuard } from '../../common/guards/throttle.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottleGuard)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      ip: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.headers?.['user-agent'] || '',
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body('refreshToken') refreshToken: string, @Req() req: any) {
    return this.authService.logout(req.user.sub, refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body('token') token: string, @Body('password') password: string) {
    return this.authService.resetPassword(token, password);
  }

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  async setupMfa(@Req() req: any) {
    return this.authService.setupMfa(req.user.sub);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@Req() req: any, @Body('code') code: string) {
    return this.authService.verifyMfa(req.user.sub, code);
  }
}
