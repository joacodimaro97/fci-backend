import type {
  AccountEntity,
  CreateAccountData,
  UpdateAccountData,
} from '../models/index.js';

export interface IAccountRepository {
  create(data: CreateAccountData): Promise<AccountEntity>;
  findById(id: string): Promise<AccountEntity | null>;
  findByUserId(userId: string): Promise<AccountEntity[]>;
  findByIdAndUserId(id: string, userId: string): Promise<AccountEntity | null>;
  update(id: string, data: UpdateAccountData): Promise<AccountEntity>;
  delete(id: string): Promise<void>;
}
