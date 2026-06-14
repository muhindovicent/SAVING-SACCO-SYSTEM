import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, username: true, role: true, email: true,
        status: true, isDeleted: true,
      },
    });

    if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is disabled or deleted');
    }

    return {
      sub: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    };
  }
}
