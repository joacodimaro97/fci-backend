import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateTransactionData,
  TransactionEntity,
  UpdateTransactionData,
} from '../../models/index.js';
import type { ITransactionRepository, TransactionFilters } from '../ITransactionRepository.js';

export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateTransactionData): Promise<TransactionEntity> {
    return this.prisma.transaction.create({ data });
  }

  async findById(id: string): Promise<TransactionEntity | null> {
    return this.prisma.transaction.findUnique({ where: { id } });
  }

  async findByFilters(filters: TransactionFilters): Promise<TransactionEntity[]> {
    const where = this.buildWhere(filters);
    return this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findByIdAndCashAccountIds(
    id: string,
    cashAccountIds: string[],
  ): Promise<TransactionEntity | null> {
    return this.prisma.transaction.findFirst({
      where: { id, cashAccountId: { in: cashAccountIds } },
    });
  }

  async update(id: string, data: UpdateTransactionData): Promise<TransactionEntity> {
    return this.prisma.transaction.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.transaction.delete({ where: { id } });
  }

  private buildWhere(filters: TransactionFilters): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {};

    if (filters.cashAccountId) {
      where.cashAccountId = filters.cashAccountId;
    } else if (filters.cashAccountIds) {
      where.cashAccountId = { in: filters.cashAccountIds };
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
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

    if (filters.excludeTransfers) {
      where.transferId = null;
    }

    if (filters.excludeFundings) {
      where.fundingId = null;
    }

    return where;
  }
}
