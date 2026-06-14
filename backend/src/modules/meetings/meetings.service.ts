import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}
}
