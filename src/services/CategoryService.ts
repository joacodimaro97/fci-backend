import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError.js';
import type { CategoryEntity, CategoryTreeNode } from '../models/index.js';
import type { ICategoryRepository } from '../repositories/ICategoryRepository.js';
import type {
  CategoryQueryInput,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../validators/category.validator.js';

export class CategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async getAll(
    userId: string,
    query: CategoryQueryInput,
  ): Promise<CategoryEntity[] | CategoryTreeNode[]> {
    const categories = await this.categoryRepository.findByFilters({
      userId,
      type: query.type,
      parentId: query.parentId,
      rootsOnly: query.rootsOnly,
    });

    if (query.tree) {
      const allForTree = await this.categoryRepository.findByFilters({
        userId,
        type: query.type,
      });
      return this.buildTree(allForTree);
    }

    return categories;
  }

  async create(userId: string, input: CreateCategoryInput): Promise<CategoryEntity> {
    const parentId = input.parentId ?? null;

    if (parentId) {
      const parent = await this.categoryRepository.findByIdAndUserId(parentId, userId);
      if (!parent) {
        throw new NotFoundError('Categoría padre');
      }
      if (parent.parentId !== null) {
        throw new ValidationError('Solo se permite un nivel de subcategorías');
      }
      if (parent.type !== input.type) {
        throw new ValidationError(
          `La subcategoría debe ser del mismo tipo que la categoría padre (${parent.type})`,
        );
      }
    }

    return this.categoryRepository.create({
      userId,
      parentId,
      name: input.name,
      type: input.type,
      color: input.color,
      icon: input.icon,
    });
  }

  async update(
    userId: string,
    categoryId: string,
    input: UpdateCategoryInput,
  ): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category) {
      throw new NotFoundError('Categoría');
    }

    const nextParentId = input.parentId === undefined ? category.parentId : input.parentId;
    const nextType = input.type ?? category.type;

    if (nextParentId === categoryId) {
      throw new ValidationError('Una categoría no puede ser padre de sí misma');
    }

    if (nextParentId) {
      const parent = await this.categoryRepository.findByIdAndUserId(nextParentId, userId);
      if (!parent) {
        throw new NotFoundError('Categoría padre');
      }
      if (parent.parentId !== null) {
        throw new ValidationError('Solo se permite un nivel de subcategorías');
      }
      if (parent.type !== nextType) {
        throw new ValidationError(
          `La subcategoría debe ser del mismo tipo que la categoría padre (${parent.type})`,
        );
      }
    }

    if (input.type !== undefined && input.type !== category.type) {
      const children = await this.categoryRepository.countChildren(categoryId);
      if (children > 0) {
        throw new ConflictError(
          'No se puede cambiar el tipo de una categoría que tiene subcategorías',
        );
      }
    }

    return this.categoryRepository.update(categoryId, {
      parentId: input.parentId,
      name: input.name,
      type: input.type,
      color: input.color,
      icon: input.icon,
    });
  }

  async delete(userId: string, categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category) {
      throw new NotFoundError('Categoría');
    }

    const usage = await this.categoryRepository.countTransactions(categoryId);
    if (usage > 0) {
      throw new ConflictError(
        'No se puede eliminar la categoría porque tiene transacciones asociadas',
      );
    }

    const children = await this.categoryRepository.countChildren(categoryId);
    if (children > 0) {
      throw new ConflictError(
        'No se puede eliminar la categoría porque tiene subcategorías. Eliminá las subcategorías primero',
      );
    }

    await this.categoryRepository.delete(categoryId);
  }

  async verifyOwnership(userId: string, categoryId: string): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category) {
      throw new NotFoundError('Categoría');
    }
    return category;
  }

  private buildTree(categories: CategoryEntity[]): CategoryTreeNode[] {
    const roots = categories.filter((c) => c.parentId === null);
    return roots.map((root) => ({
      ...root,
      children: categories
        .filter((c) => c.parentId === root.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }
}
