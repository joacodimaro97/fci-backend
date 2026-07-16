import type {
  BudgetEntity,
  CreateBudgetData,
  UpdateBudgetData,
} from '../models/index.js';

export interface IBudgetRepository {
  create(data: CreateBudgetData): Promise<BudgetEntity>;
  findByUserId(userId: string): Promise<BudgetEntity[]>;
  findByIdAndUserId(id: string, userId: string): Promise<BudgetEntity | null>;
  update(id: string, data: UpdateBudgetData): Promise<BudgetEntity>;
  delete(id: string): Promise<void>;
}
