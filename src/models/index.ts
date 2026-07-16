import type {
  CashTransactionType,
  FundingType,
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
  fundingId: string | null;
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
  fundingId?: string;
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
  transferId: string | null;
  fundingId: string | null;
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
  transferId?: string;
  fundingId?: string;
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

export interface CashTransferEntity {
  id: string;
  userId: string;
  fromCashAccountId: string;
  toCashAccountId: string;
  amount: number;
  date: Date;
  description: string | null;
  createdAt: Date;
}

export interface CashTransferAccountInfo {
  id: string;
  name: string;
  currency: string;
}

export interface CashTransferWithDetails extends CashTransferEntity {
  fromAccount: CashTransferAccountInfo;
  toAccount: CashTransferAccountInfo;
  outTransactionId: string;
  inTransactionId: string;
}

export interface CreateCashTransferData {
  userId: string;
  fromCashAccountId: string;
  toCashAccountId: string;
  amount: number;
  date: Date;
  description?: string;
  outCategoryId: string;
  inCategoryId: string;
}

export interface AccountFundingEntity {
  id: string;
  userId: string;
  type: FundingType;
  cashAccountId: string;
  investmentAccountId: string;
  amount: number;
  date: Date;
  description: string | null;
  createdAt: Date;
}

export interface FundingAccountInfo {
  id: string;
  name: string;
  currency: string;
}

export interface FundingInvestmentAccountInfo extends FundingAccountInfo {
  investmentType: InvestmentType;
}

export interface AccountFundingWithDetails extends AccountFundingEntity {
  cashAccount: FundingAccountInfo;
  investmentAccount: FundingInvestmentAccountInfo;
  cashTransactionId: string;
  investmentMovementId: string;
}

export interface CreateAccountFundingData {
  userId: string;
  type: FundingType;
  cashAccountId: string;
  investmentAccountId: string;
  amount: number;
  date: Date;
  description?: string;
  cashCategoryId: string;
  cashTransactionType: CashTransactionType;
  movementType: MovementType;
}

export interface BudgetEntity {
  id: string;
  userId: string;
  cashAccountId: string | null;
  name: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  categoryIds: string[];
}

export interface CreateBudgetData {
  userId: string;
  cashAccountId?: string | null;
  name: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  categoryIds?: string[];
}

export interface UpdateBudgetData {
  cashAccountId?: string | null;
  name?: string;
  amount?: number;
  startDate?: Date;
  endDate?: Date;
  categoryIds?: string[];
}

export type BudgetStatus =
  | 'NOT_STARTED'
  | 'ON_TRACK'
  | 'UNDER_BUDGET'
  | 'OVER_BUDGET'
  | 'COMPLETED';

export interface BudgetAnalysis {
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  dailyAllowance: number;
  spent: number;
  remaining: number;
  expectedToDate: number;
  difference: number;
  suggestedDailyRemaining: number;
  averageDailySpent: number;
  projectedTotal: number;
  percentUsed: number;
  overspent: boolean;
  status: BudgetStatus;
}

export interface BudgetAccountInfo {
  id: string;
  name: string;
  currency: string;
}

export interface BudgetCategoryInfo {
  id: string;
  name: string;
  type: CashTransactionType;
  color: string | null;
  parentId: string | null;
}

export interface BudgetWithAnalysis extends BudgetEntity {
  cashAccount: BudgetAccountInfo | null;
  categories: BudgetCategoryInfo[];
  analysis: BudgetAnalysis;
}
