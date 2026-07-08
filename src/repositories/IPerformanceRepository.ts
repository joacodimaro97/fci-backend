import type {
  CreatePerformanceData,
  MonthlyPerformanceAggregate,
  PerformanceEntity,
  UpdatePerformanceData,
  UpsertPerformanceResult,
  YearlyPerformanceAggregate,
} from '../models/index.js';

export interface PerformanceFilters {
  accountId?: string;
  accountIds?: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface IPerformanceRepository {
  create(data: CreatePerformanceData): Promise<PerformanceEntity>;
  upsertByAccountAndDate(data: CreatePerformanceData): Promise<UpsertPerformanceResult>;
  findById(id: string): Promise<PerformanceEntity | null>;
  findByFilters(filters: PerformanceFilters): Promise<PerformanceEntity[]>;
  findByIdAndAccountIds(id: string, accountIds: string[]): Promise<PerformanceEntity | null>;
  update(id: string, data: UpdatePerformanceData): Promise<PerformanceEntity>;
  delete(id: string): Promise<void>;
  getMonthlyAggregates(accountIds: string[], year?: number): Promise<MonthlyPerformanceAggregate[]>;
  getYearlyAggregates(accountIds: string[]): Promise<YearlyPerformanceAggregate[]>;
}
