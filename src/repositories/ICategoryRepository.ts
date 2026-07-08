import type { CashTransactionType } from '../types/enums.js';
import type {
  CategoryEntity,
  CreateCategoryData,
  UpdateCategoryData,
} from '../models/index.js';

export interface CategoryFilters {
  userId: string;
  type?: CashTransactionType;
  parentId?: string | null;
  rootsOnly?: boolean;
}

export interface ICategoryRepository {
  create(data: CreateCategoryData): Promise<CategoryEntity>;
  findById(id: string): Promise<CategoryEntity | null>;
  findByFilters(filters: CategoryFilters): Promise<CategoryEntity[]>;
  findByIdAndUserId(id: string, userId: string): Promise<CategoryEntity | null>;
  update(id: string, data: UpdateCategoryData): Promise<CategoryEntity>;
  delete(id: string): Promise<void>;
  countTransactions(categoryId: string): Promise<number>;
  countChildren(categoryId: string): Promise<number>;
}
