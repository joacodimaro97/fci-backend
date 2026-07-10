import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  AccountFundingWithDetails,
  CreateAccountFundingData,
} from '../../models/index.js';
import type {
  AccountFundingFilters,
  IAccountFundingRepository,
} from '../IAccountFundingRepository.js';

const cashAccountSelect = { id: true, name: true, currency: true } as const;
const investmentAccountSelect = {
  id: true,
  name: true,
  currency: true,
  investmentType: true,
} as const;

export class PrismaAccountFundingRepository implements IAccountFundingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateAccountFundingData): Promise<AccountFundingWithDetails> {
    const result = await this.prisma.$transaction(async (tx) => {
      const funding = await tx.accountFunding.create({
        data: {
          userId: data.userId,
          type: data.type,
          cashAccountId: data.cashAccountId,
          investmentAccountId: data.investmentAccountId,
          amount: data.amount,
          date: data.date,
          description: data.description,
        },
        include: {
          cashAccount: { select: cashAccountSelect },
          investmentAccount: { select: investmentAccountSelect },
        },
      });

      const description = data.description ?? this.defaultDescription(data.type);

      const cashTransaction = await tx.transaction.create({
        data: {
          cashAccountId: data.cashAccountId,
          categoryId: data.cashCategoryId,
          type: data.cashTransactionType,
          amount: data.amount,
          date: data.date,
          description,
          fundingId: funding.id,
        },
      });

      const investmentMovement = await tx.movement.create({
        data: {
          accountId: data.investmentAccountId,
          type: data.movementType,
          amount: data.amount,
          date: data.date,
          description,
          fundingId: funding.id,
        },
      });

      return { funding, cashTransaction, investmentMovement };
    });

    return this.mapToDetails(
      result.funding,
      result.cashTransaction.id,
      result.investmentMovement.id,
    );
  }

  async findByFilters(filters: AccountFundingFilters): Promise<AccountFundingWithDetails[]> {
    const where = this.buildWhere(filters);

    const fundings = await this.prisma.accountFunding.findMany({
      where,
      include: {
        cashAccount: { select: cashAccountSelect },
        investmentAccount: { select: investmentAccountSelect },
        transactions: { select: { id: true } },
        movements: { select: { id: true } },
      },
      orderBy: { date: 'desc' },
    });

    return fundings.map((funding) =>
      this.mapToDetails(
        funding,
        funding.transactions[0]?.id ?? '',
        funding.movements[0]?.id ?? '',
      ),
    );
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<AccountFundingWithDetails | null> {
    const funding = await this.prisma.accountFunding.findFirst({
      where: { id, userId },
      include: {
        cashAccount: { select: cashAccountSelect },
        investmentAccount: { select: investmentAccountSelect },
        transactions: { select: { id: true } },
        movements: { select: { id: true } },
      },
    });

    if (!funding) {
      return null;
    }

    return this.mapToDetails(
      funding,
      funding.transactions[0]?.id ?? '',
      funding.movements[0]?.id ?? '',
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.accountFunding.delete({ where: { id } });
  }

  private buildWhere(filters: AccountFundingFilters): Prisma.AccountFundingWhereInput {
    const where: Prisma.AccountFundingWhereInput = { userId: filters.userId };

    if (filters.cashAccountId) {
      where.cashAccountId = filters.cashAccountId;
    }

    if (filters.investmentAccountId) {
      where.investmentAccountId = filters.investmentAccountId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    return where;
  }

  private defaultDescription(type: CreateAccountFundingData['type']): string {
    return type === 'CASH_TO_INVESTMENT'
      ? 'Depósito a cuenta de inversión'
      : 'Retiro desde cuenta de inversión';
  }

  private mapToDetails(
    funding: {
      id: string;
      userId: string;
      type: AccountFundingWithDetails['type'];
      cashAccountId: string;
      investmentAccountId: string;
      amount: number;
      date: Date;
      description: string | null;
      createdAt: Date;
      cashAccount: { id: string; name: string; currency: string };
      investmentAccount: {
        id: string;
        name: string;
        currency: string;
        investmentType: AccountFundingWithDetails['investmentAccount']['investmentType'];
      };
    },
    cashTransactionId: string,
    investmentMovementId: string,
  ): AccountFundingWithDetails {
    return {
      id: funding.id,
      userId: funding.userId,
      type: funding.type,
      cashAccountId: funding.cashAccountId,
      investmentAccountId: funding.investmentAccountId,
      amount: funding.amount,
      date: funding.date,
      description: funding.description,
      createdAt: funding.createdAt,
      cashAccount: funding.cashAccount,
      investmentAccount: funding.investmentAccount,
      cashTransactionId,
      investmentMovementId,
    };
  }
}
