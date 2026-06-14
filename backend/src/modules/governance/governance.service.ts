import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMeetings() {
    return this.prisma.meeting.findMany({
      orderBy: { date: 'desc' },
      include: { resolutions: true },
    });
  }

  async getMeeting(id: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: { resolutions: { include: { votes: true } } },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  async createMeeting(dto: any) {
    return this.prisma.meeting.create({
      data: {
        title: dto.title,
        type: dto.type || 'AGM',
        date: new Date(dto.date),
        venue: dto.venue,
        agenda: dto.agenda || [],
        status: 'SCHEDULED',
        createdBy: dto.createdBy,
      },
    });
  }

  async updateMeeting(id: string, dto: any) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.meeting.update({
      where: { id },
      data: {
        title: dto.title,
        type: dto.type,
        date: dto.date ? new Date(dto.date) : undefined,
        venue: dto.venue,
        agenda: dto.agenda,
        minutes: dto.minutes,
        status: dto.status,
      },
    });
  }

  async createResolution(dto: any) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: dto.meetingId } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.resolution.create({
      data: {
        meetingId: dto.meetingId,
        title: dto.title,
        description: dto.description,
        status: 'PROPOSED',
        createdBy: dto.createdBy,
      },
    });
  }

  async vote(resolutionId: string, memberId: string, vote: string) {
    if (!['FOR', 'AGAINST', 'ABSTAIN'].includes(vote)) {
      throw new BadRequestException('Vote must be FOR, AGAINST, or ABSTAIN');
    }

    const resolution = await this.prisma.resolution.findUnique({ where: { id: resolutionId } });
    if (!resolution) throw new NotFoundException('Resolution not found');

    // Check for duplicate vote
    const existing = await this.prisma.vote.findUnique({
      where: { resolutionId_memberId: { resolutionId, memberId } },
    });
    if (existing) throw new BadRequestException('Already voted on this resolution');

    return this.prisma.$transaction(async (tx) => {
      await tx.vote.create({
        data: { resolutionId, memberId, vote },
      });

      const counts = await tx.vote.groupBy({
        by: ['vote'],
        where: { resolutionId },
        _count: true,
      });

      const votesFor = counts.find((c) => c.vote === 'FOR')?._count || 0;
      const votesAgainst = counts.find((c) => c.vote === 'AGAINST')?._count || 0;
      const votesAbstain = counts.find((c) => c.vote === 'ABSTAIN')?._count || 0;

      await tx.resolution.update({
        where: { id: resolutionId },
        data: { votesFor, votesAgainst, votesAbstain },
      });

      return { resolutionId, vote, votesFor, votesAgainst, votesAbstain };
    });
  }
}
