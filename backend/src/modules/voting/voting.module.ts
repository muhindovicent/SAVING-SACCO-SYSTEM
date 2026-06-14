import { Module } from '@nestjs/common'
import { PrismaModule } from '../../infrastructure/database/prisma.module'
import { VotingService } from './voting.service'
import { VotingController } from './voting.controller'

@Module({
  imports: [PrismaModule],
  controllers: [VotingController],
  providers: [VotingService],
  exports: [VotingService],
})
export class VotingModule {}
