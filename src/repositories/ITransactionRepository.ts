import type { CashTransactionType } from '../types/enums.js';
import type {
  CreateTransactionData,
  TransactionEntity,
  UpdateTransactionData,
} from '../models/index.js';

export interface TransactionFilters {
  cashAccountIds?: string[];
  cashAccountId?: string;
  categoryId?: string;
  type?: CashTransactionType;
  startDate?: Date;
  endDate?: Date;
  excludeTransfers?: boolean;
  excludeFundings?: boolean;
}

export interface ITransactionRepository {
  create(data: CreateTransactionData): Promise<TransactionEntity>;
  findById(id: string): Promise<TransactionEntity | null>;
  findByFilters(filters: TransactionFilters): Promise<TransactionEntity[]>;
  findByIdAndCashAccountIds(
    id: string,
    cashAccountIds: string[],
  ): Promise<TransactionEntity | null>;
  update(id: string, data: UpdateTransactionData): Promise<TransactionEntity>;
  delete(id: string): Promise<void>;
}
