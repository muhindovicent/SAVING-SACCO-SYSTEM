import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'

@Injectable()
export class PenaltiesService {
  constructor(private prisma: PrismaService) {}
}
