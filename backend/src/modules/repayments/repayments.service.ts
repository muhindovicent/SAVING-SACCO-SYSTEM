import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'

@Injectable()
export class RepaymentsService {
  constructor(private prisma: PrismaService) {}
}
