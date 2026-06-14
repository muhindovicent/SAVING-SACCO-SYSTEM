import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../../infrastructure/cache/cache.service';

@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const key = `ratelimit:${ip}`;

    const limit = 100; // requests per window
    const window = 60; // seconds

    const count = await this.cacheService.increment(key, window);
    if (count > limit) {
      throw new ForbiddenException('Too many requests. Please try again later.');
    }
    return true;
  }
}
