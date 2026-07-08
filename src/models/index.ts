import type {
  CashTransactionType,
  InvestmentType,
  MovementType,
  SimulationType,
} from '../types/enums.js';

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountEntity {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  currency: string;
  investmentType: InvestmentType;
  createdAt: Date;
  updatedAt: Date;
}

export interface MovementEntity {
  id: string;
  accountId: string;
  type: MovementType;
  amount: number;
  date: Date;
  description: string | null;
  createdAt: Date;
}

export interface PerformanceEntity {
  id: string;
  accountId: string;
  date: Date;
  dailyReturnPercent: number;
  dailyProfit: number;
  shareValue: number;
  notes: string | null;
  createdAt: Date;
}

export interface SimulationEntity {
  id: string;
  accountId: string;
  name: string;
  simulationType: SimulationType;
  capitalInitial: number;
  monthlyContribution: number;
  annualRate: number | null;
  years: number;
  createdAt: Date;
}

export interface SimulationResultEntity {
  id: string;
  simulationId: string;
  day: number;
  capital: number;
  profit: number;
  dailyRate: number;
}

export interface SimulationWithResults extends SimulationEntity {
  results: SimulationResultEntity[];
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

export interface CreateAccountData {
  userId: string;
  name: string;
  description?: string;
  currency?: string;
  investmentType: InvestmentType;
}

export interface UpdateAccountData {
  name?: string;
  description?: string | null;
  currency?: string;
  investmentType?: InvestmentType;
}

export interface CreateMovementData {
  accountId: string;
  type: MovementType;
  amount: number;
  date: Date;
  description?: string;
}

export interface UpdateMovementData {
  type?: MovementType;
  amount?: number;
  date?: Date;
  description?: string | null;
}

export interface CreatePerformanceData {
  accountId: string;
  date: Date;
  dailyReturnPercent: number;
  dailyProfit: number;
  shareValue: number;
  notes?: string;
}

export interface UpsertPerformanceResult {
  performance: PerformanceEntity;
  created: boolean;
}

export interface UpdatePerformanceData {
  date?: Date;
  dailyReturnPercent?: number;
  dailyProfit?: number;
  shareValue?: number;
  notes?: string | null;
}

export interface CreateSimulationData {
  accountId: string;
  name: string;
  simulationType: SimulationType;
  capitalInitial: number;
  monthlyContribution?: number;
  annualRate?: number;
  years: number;
}

export interface CreateSimulationResultData {
  day: number;
  capital: number;
  profit: number;
  dailyRate: number;
}

export interface MonthlyPerformanceAggregate {
  year: number;
  month: number;
  totalReturnPercent: number;
  totalProfit: number;
  days: number;
}

export interface YearlyPerformanceAggregate {
  year: number;
  totalReturnPercent: number;
  totalProfit: number;
  days: number;
}

export interface CashAccountEntity {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  currency: string;
  openingBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryEntity {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  type: CashTransactionType;
  color: string | null;
  icon: string | null;
  createdAt: Date;
}

export interface CategoryTreeNode extends CategoryEntity {
  children: CategoryEntity[];
}

export interface TransactionEntity {
  id: string;
  cashAccountId: string;
  categoryId: string;
  type: CashTransactionType;
  amount: number;
  date: Date;
  description: string | null;
  createdAt: Date;
}

export interface CreateCashAccountData {
  userId: string;
  name: string;
  description?: string;
  currency?: string;
  openingBalance?: number;
}

export interface UpdateCashAccountData {
  name?: string;
  description?: string | null;
  currency?: string;
  openingBalance?: number;
}

export interface CreateCategoryData {
  userId: string;
  parentId?: string | null;
  name: string;
  type: CashTransactionType;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryData {
  parentId?: string | null;
  name?: string;
  type?: CashTransactionType;
  color?: string | null;
  icon?: string | null;
}

export interface CreateTransactionData {
  cashAccountId: string;
  categoryId: string;
  type: CashTransactionType;
  amount: number;
  date: Date;
  description?: string;
}

export interface UpdateTransactionData {
  cashAccountId?: string;
  categoryId?: string;
  type?: CashTransactionType;
  amount?: number;
  date?: Date;
  description?: string | null;
}

export interface CashSummaryByCategory {
  categoryId: string;
  categoryName: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  type: CashTransactionType;
  total: number;
  count: number;
}

export interface CashSummaryByParentCategory {
  categoryId: string;
  categoryName: string;
  type: CashTransactionType;
  total: number;
  count: number;
}

export interface CashSummaryResult {
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: CashSummaryByCategory[];
  byParentCategory: CashSummaryByParentCategory[];
}
