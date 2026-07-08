import type { PrismaClient } from '@prisma/client';
import type {
  AccountEntity,
  CreateAccountData,
  UpdateAccountData,
} from '../../models/index.js';
import type { IAccountRepository } from '../IAccountRepository.js';

export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateAccountData): Promise<AccountEntity> {
    return this.prisma.account.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description,
        currency: data.currency ?? 'ARS',
        investmentType: data.investmentType,
      },
    });
  }

  async findById(id: string): Promise<AccountEntity | null> {
    return this.prisma.account.findUnique({ where: { id } });
  }

  async findByUserId(userId: string): Promise<AccountEntity[]> {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<AccountEntity | null> {
    return this.prisma.account.findFirst({
      where: { id, userId },
    });
  }

  async update(id: string, data: UpdateAccountData): Promise<AccountEntity> {
    return this.prisma.account.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.account.delete({ where: { id } });
  }
}
