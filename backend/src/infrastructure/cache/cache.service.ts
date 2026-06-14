import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;
  private readonly defaultTtl = 300; // 5 minutes

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', ''),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl || this.defaultTtl) {
      await this.client.setex(key, ttl || this.defaultTtl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length) {
      await this.client.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Session management helpers
  async setSession(userId: string, token: string, ttl: number): Promise<void> {
    await this.set(`session:${userId}:${token}`, true, ttl);
  }

  async invalidateSession(userId: string, token: string): Promise<void> {
    await this.del(`session:${userId}:${token}`);
  }

  // Rate limiting
  async increment(key: string, ttl: number): Promise<number> {
    const multi = this.client.multi();
    multi.incr(key);
    multi.expire(key, ttl);
    const results = await multi.exec();
    return results?.[0]?.[1] as number ?? 0;
  }

  // OTP storage
  async storeOtp(identifier: string, otp: string, ttl: number = 300): Promise<void> {
    await this.set(`otp:${identifier}`, otp, ttl);
  }

  async verifyOtp(identifier: string, otp: string): Promise<boolean> {
    const stored = await this.get<string>(`otp:${identifier}`);
    if (!stored || stored !== otp) return false;
    await this.del(`otp:${identifier}`);
    return true;
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
