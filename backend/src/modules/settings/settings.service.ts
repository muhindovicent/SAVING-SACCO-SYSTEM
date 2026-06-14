import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}
}
