import type {
  CashTransferWithDetails,
  CreateCashTransferData,
} from '../models/index.js';

export interface CashTransferFilters {
  userId: string;
  cashAccountId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ICashTransferRepository {
  create(data: CreateCashTransferData): Promise<CashTransferWithDetails>;
  findByFilters(filters: CashTransferFilters): Promise<CashTransferWithDetails[]>;
  findByIdAndUserId(id: string, userId: string): Promise<CashTransferWithDetails | null>;
  delete(id: string): Promise<void>;
}
