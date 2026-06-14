import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveMemberId(userId: string): Promise<string> {
    const member = await this.prisma.member.findUnique({ where: { userId } });
    if (!member) throw new NotFoundException('Member profile not found');
    return member.id;
  }

  async getAccount(memberId: string) {
    let share = await this.prisma.share.findUnique({ where: { memberId } });
    if (!share) {
      share = await this.prisma.share.create({
        data: { memberId, totalUnits: 0, totalValue: 0 },
      });
    }

    const [purchases, currentPrice] = await Promise.all([
      this.prisma.sharePurchase.findMany({
        where: { memberId },
        orderBy: { purchasedAt: 'desc' },
        take: 20,
      }),
      this.prisma.shareValue.findFirst({
        orderBy: { effectiveDate: 'desc' },
      }),
    ]);

    const pricePerUnit = currentPrice?.pricePerUnit.toNumber() || 100;

    return {
      ...share,
      currentPrice: pricePerUnit,
      marketValue: share.totalUnits.toNumber() * pricePerUnit,
      transactions: purchases,
    };
  }

  async purchase(memberId: string, dto: any) {
    let share = await this.prisma.share.findUnique({ where: { memberId } });
    if (!share) {
      share = await this.prisma.share.create({
        data: { memberId, totalUnits: 0, totalValue: 0 },
      });
    }

    const currentPrice = await this.prisma.shareValue.findFirst({
      orderBy: { effectiveDate: 'desc' },
    });
    const pricePerUnit = currentPrice?.pricePerUnit.toNumber() || 100;
    const units = dto.amount / pricePerUnit;

    if (units < 1) {
      throw new BadRequestException(`Minimum purchase is 1 share (${pricePerUnit})`);
    }

    const reference = `SHR-${Date.now().toString(36).toUpperCase()}`;
    const periodId = await this.getOrCreatePeriod();

    return this.prisma.$transaction(async (tx) => {
      await tx.share.update({
        where: { memberId },
        data: {
          totalUnits: { increment: units },
          totalValue: { increment: dto.amount },
        },
      });

      const purchase = await tx.sharePurchase.create({
        data: {
          memberId,
          shareId: share.id,
          units,
          pricePerUnit,
          totalAmount: dto.amount,
        },
      });

      await tx.journalEntry.create({
        data: {
          journalNo: `JE-${Date.now()}-SHR`,
          description: `Share purchase: ${units} shares @ ${pricePerUnit}`,
          entryDate: new Date(),
          totalDebit: dto.amount,
          totalCredit: dto.amount,
          reference,
          referenceId: purchase.id,
          refType: 'SHARE_PURCHASE',
          periodId,
          postedBy: 'SYSTEM',
          lines: {
            create: [
              {
                accountId: await this.resolveAccountCode(tx, 'CASH_AND_BANK'),
                debit: dto.amount,
                credit: 0,
                description: 'Share payment',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'SHARE_CAPITAL'),
                debit: 0,
                credit: dto.amount,
                description: 'Share capital issued',
              },
            ],
          },
        },
      });

      return purchase;
    });
  }

  async getTransactions(memberId: string) {
    return this.prisma.sharePurchase.findMany({
      where: { memberId },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  async declareDividend(amountPerShare: number, financialYear: string, approvedBy: string) {
    const shares = await this.prisma.share.findMany({
      where: { totalUnits: { gt: 0 } },
    });

    return this.prisma.$transaction(async (tx) => {
      const totalUnits = shares.reduce((s, sh) => s + sh.totalUnits.toNumber(), 0);
      const totalAmount = totalUnits * amountPerShare;

      const dividend = await tx.dividendDistribution.create({
        data: {
          financialYear,
          totalAmount,
          perUnitAmount: amountPerShare,
          declaredAt: new Date(),
          approvedBy,
          status: 'DECLARED',
        },
      });

      await tx.journalEntry.create({
        data: {
          journalNo: `JE-${Date.now()}-DIV`,
          description: `Dividend declaration for FY ${financialYear}`,
          entryDate: new Date(),
          totalDebit: totalAmount,
          totalCredit: totalAmount,
          reference: `DIV-${financialYear}`,
          referenceId: dividend.id,
          refType: 'DIVIDEND',
          periodId: await this.getOrCreatePeriod(tx),
          postedBy: approvedBy,
          lines: {
            create: [
              {
                accountId: await this.resolveAccountCode(tx, 'RETAINED_EARNINGS'),
                debit: totalAmount,
                credit: 0,
                description: 'Dividend declared',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'DIVIDENDS_PAYABLE'),
                debit: 0,
                credit: totalAmount,
                description: 'Dividend payable',
              },
            ],
          },
        },
      });

      return dividend;
    });
  }

  private async getOrCreatePeriod(tx?: any): Promise<string> {
    const client = tx || this.prisma;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const periodName = `${year}-${month.toString().padStart(2, '0')}`;

    let period = await client.financialPeriod.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        isClosed: false,
      },
    });

    if (!period) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      period = await client.financialPeriod.create({
        data: { name: periodName, startDate, endDate, isClosed: false },
      });
    }

    return period.id;
  }

  private async resolveAccountCode(tx: any, code: string): Promise<string> {
    const account = await tx.chartOfAccount.findUnique({ where: { code } });
    if (account) return account.id;

    const standardAccounts: Record<string, { name: string; category: string; subCategory: string; normalSide: string }> = {
      CASH_AND_BANK: { name: 'Cash & Bank', category: 'ASSET', subCategory: 'CURRENT_ASSET', normalSide: 'DEBIT' },
      SHARE_CAPITAL: { name: 'Share Capital', category: 'EQUITY', subCategory: 'SHARE_CAPITAL', normalSide: 'CREDIT' },
      RETAINED_EARNINGS: { name: 'Retained Earnings', category: 'EQUITY', subCategory: 'RETAINED_EARNINGS', normalSide: 'CREDIT' },
      DIVIDENDS_PAYABLE: { name: 'Dividends Payable', category: 'LIABILITY', subCategory: 'CURRENT_LIABILITY', normalSide: 'CREDIT' },
    };

    const def = standardAccounts[code];
    if (def) {
      const created = await tx.chartOfAccount.create({
        data: {
          code,
          name: def.name,
          category: def.category as any,
          subCategory: def.subCategory as any,
          normalSide: def.normalSide,
          isActive: true,
        },
      });
      return created.id;
    }

    throw new BadRequestException(`Chart of account not found: ${code}`);
  }
}
