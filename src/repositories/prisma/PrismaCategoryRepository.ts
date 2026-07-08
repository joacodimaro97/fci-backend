import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CategoryEntity,
  CreateCategoryData,
  UpdateCategoryData,
} from '../../models/index.js';
import type { CategoryFilters, ICategoryRepository } from '../ICategoryRepository.js';

export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    return this.prisma.category.create({
      data: {
        userId: data.userId,
        parentId: data.parentId ?? null,
        name: data.name,
        type: data.type,
        color: data.color,
        icon: data.icon,
      },
    });
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  async findByFilters(filters: CategoryFilters): Promise<CategoryEntity[]> {
    const where: Prisma.CategoryWhereInput = { userId: filters.userId };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.rootsOnly) {
      where.parentId = null;
    } else if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    return this.prisma.category.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<CategoryEntity | null> {
    return this.prisma.category.findFirst({
      where: { id, userId },
    });
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryEntity> {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }

  async countTransactions(categoryId: string): Promise<number> {
    return this.prisma.transaction.count({ where: { categoryId } });
  }

  async countChildren(categoryId: string): Promise<number> {
    return this.prisma.category.count({ where: { parentId: categoryId } });
  }
}
