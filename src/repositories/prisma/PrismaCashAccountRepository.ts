import type { PrismaClient } from '@prisma/client';
import type {
  CashAccountEntity,
  CreateCashAccountData,
  UpdateCashAccountData,
} from '../../models/index.js';
import type { ICashAccountRepository } from '../ICashAccountRepository.js';

export class PrismaCashAccountRepository implements ICashAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCashAccountData): Promise<CashAccountEntity> {
    return this.prisma.cashAccount.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description,
        currency: data.currency ?? 'ARS',
        openingBalance: data.openingBalance ?? 0,
      },
    });
  }

  async findById(id: string): Promise<CashAccountEntity | null> {
    return this.prisma.cashAccount.findUnique({ where: { id } });
  }

  async findByUserId(userId: string): Promise<CashAccountEntity[]> {
    return this.prisma.cashAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<CashAccountEntity | null> {
    return this.prisma.cashAccount.findFirst({
      where: { id, userId },
    });
  }

  async update(id: string, data: UpdateCashAccountData): Promise<CashAccountEntity> {
    return this.prisma.cashAccount.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.cashAccount.delete({ where: { id } });
  }
}
