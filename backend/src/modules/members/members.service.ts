import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { UserStatus, MemberStatus, KycStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        where: { isDeleted: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true, status: true } },
          savingsAccounts: { where: { isDeleted: false }, take: 1, orderBy: { createdAt: 'desc' } },
          loanApplications: { take: 1, orderBy: { submittedAt: 'desc' } },
          shares: { take: 1 },
        },
      }),
      this.prisma.member.count({ where: { isDeleted: false } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, email: true, status: true, role: true } },
        savingsAccounts: {
          where: { isDeleted: false },
          include: { product: true, goals: { where: { currentAmount: { lt: 1000000 } } } },
        },
        loanApplications: {
          where: { isDeleted: false },
          include: { loan: true },
        },
        shares: true,
      },
    });

    if (!member || member.isDeleted) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async findByMemberNumber(memberNumber: string) {
    const member = await this.prisma.member.findUnique({
      where: { memberNumber },
      include: {
        user: { select: { id: true, username: true, email: true, status: true } },
      },
    });

    if (!member || member.isDeleted) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async create(dto: any) {
    const existing = await this.prisma.member.findUnique({
      where: { memberNumber: dto.memberNumber },
    });
    if (existing) {
      throw new ConflictException('Member number already exists');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) throw new ConflictException('Email already in use');
    }

    const passwordHash = await argon2.hash(dto.password || 'defaultPassword123');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          phone: dto.phonePrimary,
          passwordHash,
          role: dto.role || Role.MEMBER,
          status: UserStatus.ACTIVE,
        },
      });

      const member = await tx.member.create({
        data: {
          userId: user.id,
          memberNumber: dto.memberNumber,
          fullName: dto.fullName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          idType: dto.idType,
          idNumber: dto.idNumber,
          phonePrimary: dto.phonePrimary,
          phoneSecondary: dto.phoneSecondary,
          email: dto.email,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          city: dto.city,
          district: dto.district,
          occupation: dto.occupation,
          employer: dto.employer,
          kycStatus: KycStatus.PENDING,
        },
      });

      // Create initial share entry
      await tx.share.create({
        data: {
          memberId: member.id,
          totalUnits: 0,
          totalValue: 0,
        },
      });

      return member;
    });
  }

  async update(id: string, dto: any) {
    await this.findById(id);

    return this.prisma.member.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phonePrimary: dto.phonePrimary,
        phoneSecondary: dto.phoneSecondary,
        email: dto.email,
        occupation: dto.occupation,
        employer: dto.employer,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        district: dto.district,
      },
    });
  }

  async activate(id: string) {
    const member = await this.findById(id);
    await this.prisma.user.update({
      where: { id: member.userId },
      data: { status: UserStatus.ACTIVE },
    });
    await this.prisma.member.update({
      where: { id },
      data: { status: MemberStatus.ACTIVE, statusChangedAt: new Date() },
    });
    return { message: 'Member activated successfully' };
  }

  async deactivate(id: string) {
    const member = await this.findById(id);
    await this.prisma.user.update({
      where: { id: member.userId },
      data: { status: UserStatus.INACTIVE },
    });
    await this.prisma.member.update({
      where: { id },
      data: { status: MemberStatus.INACTIVE, statusChangedAt: new Date() },
    });
    return { message: 'Member deactivated successfully' };
  }

  async getProfile(userId: string) {
    const member = await this.prisma.member.findUnique({
      where: { userId },
      include: {
        savingsAccounts: {
          where: { isDeleted: false },
          include: { product: true },
        },
        loanApplications: {
          where: { isDeleted: false },
          include: { loan: true, product: true },
        },
        shares: true,
      },
    });

    if (!member) throw new NotFoundException('Member profile not found');

    const totalSavings = member.savingsAccounts.reduce(
      (sum, a) => sum + a.balance.toNumber(), 0,
    );
    const shareData = member.shares[0];
    const totalShares = shareData?.totalUnits.toNumber() || 0;
    const totalShareValue = shareData?.totalValue.toNumber() || 0;

    const loans = member.loanApplications
      .filter((l) => l.loan && ['ACTIVE', 'OVERDUE'].includes(l.loan.status))
      .map((l) => l.loan!);
    const activeLoanCount = loans.length;
    const totalLoanBalance = loans.reduce(
      (sum, l) => sum + l.balance.toNumber(), 0,
    );

    return {
      ...member,
      _summary: {
        totalSavings,
        totalShares,
        totalShareValue,
        activeLoans: activeLoanCount,
        totalLoanBalance,
      },
    };
  }
}
