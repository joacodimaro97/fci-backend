import type { Prisma, PrismaClient } from '@prisma/client';
import { CashTransactionType } from '../../types/enums.js';
import type {
  CashTransferWithDetails,
  CreateCashTransferData,
} from '../../models/index.js';
import type {
  CashTransferFilters,
  ICashTransferRepository,
} from '../ICashTransferRepository.js';

const accountSelect = { id: true, name: true, currency: true } as const;

export class PrismaCashTransferRepository implements ICashTransferRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCashTransferData): Promise<CashTransferWithDetails> {
    const result = await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.cashTransfer.create({
        data: {
          userId: data.userId,
          fromCashAccountId: data.fromCashAccountId,
          toCashAccountId: data.toCashAccountId,
          amount: data.amount,
          date: data.date,
          description: data.description,
        },
        include: {
          fromAccount: { select: accountSelect },
          toAccount: { select: accountSelect },
        },
      });

      const description = data.description ?? 'Transferencia entre cuentas';

      const outTransaction = await tx.transaction.create({
        data: {
          cashAccountId: data.fromCashAccountId,
          categoryId: data.outCategoryId,
          type: CashTransactionType.EXPENSE,
          amount: data.amount,
          date: data.date,
          description,
          transferId: transfer.id,
        },
      });

      const inTransaction = await tx.transaction.create({
        data: {
          cashAccountId: data.toCashAccountId,
          categoryId: data.inCategoryId,
          type: CashTransactionType.INCOME,
          amount: data.amount,
          date: data.date,
          description,
          transferId: transfer.id,
        },
      });

      return { transfer, outTransaction, inTransaction };
    });

    return this.mapToDetails(
      result.transfer,
      result.outTransaction.id,
      result.inTransaction.id,
    );
  }

  async findByFilters(filters: CashTransferFilters): Promise<CashTransferWithDetails[]> {
    const where = this.buildWhere(filters);

    const transfers = await this.prisma.cashTransfer.findMany({
      where,
      include: {
        fromAccount: { select: accountSelect },
        toAccount: { select: accountSelect },
        transactions: { select: { id: true, type: true } },
      },
      orderBy: { date: 'desc' },
    });

    return transfers.map((transfer) => {
      const outTx = transfer.transactions.find((t) => t.type === CashTransactionType.EXPENSE);
      const inTx = transfer.transactions.find((t) => t.type === CashTransactionType.INCOME);
      return this.mapToDetails(transfer, outTx?.id ?? '', inTx?.id ?? '');
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<CashTransferWithDetails | null> {
    const transfer = await this.prisma.cashTransfer.findFirst({
      where: { id, userId },
      include: {
        fromAccount: { select: accountSelect },
        toAccount: { select: accountSelect },
        transactions: { select: { id: true, type: true } },
      },
    });

    if (!transfer) {
      return null;
    }

    const outTx = transfer.transactions.find((t) => t.type === CashTransactionType.EXPENSE);
    const inTx = transfer.transactions.find((t) => t.type === CashTransactionType.INCOME);
    return this.mapToDetails(transfer, outTx?.id ?? '', inTx?.id ?? '');
  }

  async delete(id: string): Promise<void> {
    await this.prisma.cashTransfer.delete({ where: { id } });
  }

  private buildWhere(filters: CashTransferFilters): Prisma.CashTransferWhereInput {
    const where: Prisma.CashTransferWhereInput = { userId: filters.userId };

    if (filters.cashAccountId) {
      where.OR = [
        { fromCashAccountId: filters.cashAccountId },
        { toCashAccountId: filters.cashAccountId },
      ];
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

  private mapToDetails(
    transfer: {
      id: string;
      userId: string;
      fromCashAccountId: string;
      toCashAccountId: string;
      amount: number;
      date: Date;
      description: string | null;
      createdAt: Date;
      fromAccount: { id: string; name: string; currency: string };
      toAccount: { id: string; name: string; currency: string };
    },
    outTransactionId: string,
    inTransactionId: string,
  ): CashTransferWithDetails {
    return {
      id: transfer.id,
      userId: transfer.userId,
      fromCashAccountId: transfer.fromCashAccountId,
      toCashAccountId: transfer.toCashAccountId,
      amount: transfer.amount,
      date: transfer.date,
      description: transfer.description,
      createdAt: transfer.createdAt,
      fromAccount: transfer.fromAccount,
      toAccount: transfer.toAccount,
      outTransactionId,
      inTransactionId,
    };
  }
}
