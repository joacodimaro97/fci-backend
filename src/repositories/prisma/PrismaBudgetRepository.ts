import type { PrismaClient } from '@prisma/client';
import type {
  BudgetEntity,
  CreateBudgetData,
  UpdateBudgetData,
} from '../../models/index.js';
import type { IBudgetRepository } from '../IBudgetRepository.js';

type BudgetRow = {
  id: string;
  userId: string;
  cashAccountId: string | null;
  name: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  categories: { categoryId: string }[];
};

export class PrismaBudgetRepository implements IBudgetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateBudgetData): Promise<BudgetEntity> {
    const budget = await this.prisma.budget.create({
      data: {
        userId: data.userId,
        cashAccountId: data.cashAccountId ?? null,
        name: data.name,
        amount: data.amount,
        startDate: data.startDate,
        endDate: data.endDate,
        categories: data.categoryIds?.length
          ? {
              create: data.categoryIds.map((categoryId) => ({ categoryId })),
            }
          : undefined,
      },
      include: { categories: { select: { categoryId: true } } },
    });

    return this.map(budget);
  }

  async findByUserId(userId: string): Promise<BudgetEntity[]> {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      include: { categories: { select: { categoryId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return budgets.map((b) => this.map(b));
  }

  async findByIdAndUserId(id: string, userId: string): Promise<BudgetEntity | null> {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: { categories: { select: { categoryId: true } } },
    });
    return budget ? this.map(budget) : null;
  }

  async update(id: string, data: UpdateBudgetData): Promise<BudgetEntity> {
    const budget = await this.prisma.$transaction(async (tx) => {
      if (data.categoryIds !== undefined) {
        await tx.budgetCategory.deleteMany({ where: { budgetId: id } });
        if (data.categoryIds.length > 0) {
          await tx.budgetCategory.createMany({
            data: data.categoryIds.map((categoryId) => ({ budgetId: id, categoryId })),
          });
        }
      }

      return tx.budget.update({
        where: { id },
        data: {
          cashAccountId: data.cashAccountId,
          name: data.name,
          amount: data.amount,
          startDate: data.startDate,
          endDate: data.endDate,
        },
        include: { categories: { select: { categoryId: true } } },
      });
    });

    return this.map(budget);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.budget.delete({ where: { id } });
  }

  private map(budget: BudgetRow): BudgetEntity {
    return {
      id: budget.id,
      userId: budget.userId,
      cashAccountId: budget.cashAccountId,
      name: budget.name,
      amount: budget.amount,
      startDate: budget.startDate,
      endDate: budget.endDate,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
      categoryIds: budget.categories.map((c) => c.categoryId),
    };
  }
}
