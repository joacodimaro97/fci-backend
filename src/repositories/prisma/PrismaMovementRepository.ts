import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateMovementData,
  MovementEntity,
  UpdateMovementData,
} from '../../models/index.js';
import type { IMovementRepository, MovementFilters } from '../IMovementRepository.js';

export class PrismaMovementRepository implements IMovementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateMovementData): Promise<MovementEntity> {
    return this.prisma.movement.create({ data });
  }

  async findById(id: string): Promise<MovementEntity | null> {
    return this.prisma.movement.findUnique({ where: { id } });
  }

  async findByFilters(filters: MovementFilters): Promise<MovementEntity[]> {
    const where = this.buildWhere(filters);
    return this.prisma.movement.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findByIdAndAccountIds(id: string, accountIds: string[]): Promise<MovementEntity | null> {
    return this.prisma.movement.findFirst({
      where: { id, accountId: { in: accountIds } },
    });
  }

  async update(id: string, data: UpdateMovementData): Promise<MovementEntity> {
    return this.prisma.movement.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.movement.delete({ where: { id } });
  }

  private buildWhere(filters: MovementFilters): Prisma.MovementWhereInput {
    const where: Prisma.MovementWhereInput = {};

    if (filters.accountId) {
      where.accountId = filters.accountId;
    } else if (filters.accountIds) {
      where.accountId = { in: filters.accountIds };
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
}
