import type {
  AccountFundingWithDetails,
  CreateAccountFundingData,
} from '../models/index.js';
import type { FundingType } from '../types/enums.js';

export interface AccountFundingFilters {
  userId: string;
  cashAccountId?: string;
  investmentAccountId?: string;
  type?: FundingType;
  startDate?: Date;
  endDate?: Date;
}

export interface IAccountFundingRepository {
  create(data: CreateAccountFundingData): Promise<AccountFundingWithDetails>;
  findByFilters(filters: AccountFundingFilters): Promise<AccountFundingWithDetails[]>;
  findByIdAndUserId(id: string, userId: string): Promise<AccountFundingWithDetails | null>;
  delete(id: string): Promise<void>;
}
