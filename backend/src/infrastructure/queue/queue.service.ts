import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private configService: ConfigService) {
    this.init();
  }

  private async init() {
    try {
      const url = this.configService.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // Assert queues
      const queues = ['transactions', 'notifications.email', 'notifications.sms', 'audit', 'reports'];
      for (const queue of queues) {
        await this.channel.assertQueue(queue, { durable: true });
      }

      this.logger.log('Connected to RabbitMQ');

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        setTimeout(() => this.init(), 5000);
      });
    } catch (error) {
      this.logger.error(`RabbitMQ connection failed: ${(error as Error).message}`);
      this.logger.warn('Queue features will be unavailable. Retrying in 10s...');
      setTimeout(() => this.init(), 10000);
    }
  }

  async publish(queue: string, message: any): Promise<void> {
    if (!this.channel) {
      this.logger.warn(`Cannot publish to ${queue}: channel not available`);
      return;
    }
    const buffer = Buffer.from(JSON.stringify(message));
    this.channel.sendToQueue(queue, buffer, { persistent: true });
  }

  async consume(queue: string, handler: (msg: any) => Promise<void>): Promise<void> {
    if (!this.channel) {
      this.logger.warn(`Cannot consume from ${queue}: channel not available`);
      return;
    }
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content);
        this.channel?.ack(msg);
      } catch (error) {
        this.logger.error(`Queue processing error: ${(error as Error).message}`);
        this.channel?.nack(msg, false, false);
      }
    });
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // ignore
    }
  }
}
