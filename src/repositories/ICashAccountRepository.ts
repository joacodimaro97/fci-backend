import type {
  CashAccountEntity,
  CreateCashAccountData,
  UpdateCashAccountData,
} from '../models/index.js';

export interface ICashAccountRepository {
  create(data: CreateCashAccountData): Promise<CashAccountEntity>;
  findById(id: string): Promise<CashAccountEntity | null>;
  findByUserId(userId: string): Promise<CashAccountEntity[]>;
  findByIdAndUserId(id: string, userId: string): Promise<CashAccountEntity | null>;
  update(id: string, data: UpdateCashAccountData): Promise<CashAccountEntity>;
  delete(id: string): Promise<void>;
}
