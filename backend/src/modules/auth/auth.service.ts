import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { LoginDto } from './dto/login.dto';
import { UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
  ) {}

  async login(
    dto: LoginDto,
    meta: { ip: string; userAgent: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || user.isDeleted) {
      await this.logLoginAttempt(null, dto.username, false, 'User not found', meta);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    if (user.status === UserStatus.LOCKED || (user.lockedUntil && user.lockedUntil > new Date())) {
      const minutesLeft = user.lockedUntil
        ? Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
        : 30;
      throw new UnauthorizedException(
        `Account locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    const validPassword = await argon2.verify(user.passwordHash, dto.password);
    if (!validPassword) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: meta.ip,
        status: UserStatus.ACTIVE,
      },
    });

    await this.logLoginAttempt(user.id, dto.username, true, undefined, meta);

    const tokens = await this.generateTokens(user);

    // Store session
    await this.cache.setSession(user.id, tokens.accessToken, 900);

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        status: user.status,
        mfaRequired: user.mfaEnabled && !dto.mfaCode,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('User not found or inactive');
      }

      await this.cache.delPattern(`session:${user.id}:*`);

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    await this.cache.delPattern(`session:${userId}:*`);
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.isDeleted) return { message: 'If the email exists, a reset link has been sent.' };

    const resetToken = uuidv4();
    await this.cache.set(`reset:${resetToken}`, user.id, 3600);

    this.logger.log(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, password: string) {
    const userId = await this.cache.get<string>(`reset:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await argon2.hash(password);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    await this.cache.del(`reset:${token}`);
    await this.cache.delPattern(`session:${userId}:*`);

    return { message: 'Password reset successfully. Please log in.' };
  }

  async setupMfa(userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const speakeasy = require('speakeasy');
    const secret = speakeasy.generateSecret({
      name: `${this.configService.get('MFA_ISSUER', 'JengaWealth')}:${userId}`,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    };
  }

  async verifyMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new BadRequestException('MFA not set up');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) throw new BadRequestException('Invalid MFA code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    return { message: 'MFA enabled successfully' };
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, username: user.username, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
    });

    return { accessToken, refreshToken };
  }

  private async handleFailedLogin(user: any) {
    const attempts = user.loginAttempts + 1;
    const maxAttempts = this.configService.get('MAX_LOGIN_ATTEMPTS', 5);
    const lockoutMinutes = this.configService.get('ACCOUNT_LOCKOUT_MINUTES', 30);

    const update: any = { loginAttempts: attempts };
    if (attempts >= maxAttempts) {
      update.lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      update.loginAttempts = 0;
      update.status = UserStatus.LOCKED;
    }

    await this.prisma.user.update({ where: { id: user.id }, data: update });
    await this.logLoginAttempt(user.id, user.username, false, 'Invalid password', {
      ip: '',
      userAgent: '',
    });
  }

  private async logLoginAttempt(
    userId: string | null,
    username: string,
    success: boolean,
    failReason?: string,
    meta?: { ip: string; userAgent: string },
  ) {
    await this.prisma.loginAttempt.create({
      data: {
        userId,
        username,
        success,
        failReason,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      },
    });
  }
}
