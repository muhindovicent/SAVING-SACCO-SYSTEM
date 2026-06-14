import { Module } from '@nestjs/common'
import { PrismaModule } from '../../infrastructure/database/prisma.module'
import { PenaltiesService } from './penalties.service'
import { PenaltiesController } from './penalties.controller'

@Module({
  imports: [PrismaModule],
  controllers: [PenaltiesController],
  providers: [PenaltiesService],
  exports: [PenaltiesService],
})
export class PenaltiesModule {}
