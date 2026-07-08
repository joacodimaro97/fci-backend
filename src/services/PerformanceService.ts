import { NotFoundError } from '../errors/AppError.js';
import type {
  MonthlyPerformanceAggregate,
  PerformanceEntity,
  UpsertPerformanceResult,
  YearlyPerformanceAggregate,
} from '../models/index.js';
import type { IAccountRepository } from '../repositories/IAccountRepository.js';
import type { IPerformanceRepository } from '../repositories/IPerformanceRepository.js';
import { normalizePerformanceDate, parseDate } from '../utils/index.js';
import type {
  CreatePerformanceInput,
  PerformancePeriodQueryInput,
  PerformanceQueryInput,
  UpdatePerformanceInput,
} from '../validators/performance.validator.js';

export class PerformanceService {
  constructor(
    private readonly performanceRepository: IPerformanceRepository,
    private readonly accountRepository: IAccountRepository,
  ) {}

  async getAll(userId: string, query: PerformanceQueryInput): Promise<PerformanceEntity[]> {
    const accountIds = await this.getFilteredAccountIds(userId, query.accountId);

    return this.performanceRepository.findByFilters({
      accountIds,
      startDate: query.startDate ? parseDate(query.startDate) : undefined,
      endDate: query.endDate ? parseDate(query.endDate) : undefined,
    });
  }

  async create(userId: string, input: CreatePerformanceInput): Promise<UpsertPerformanceResult> {
    await this.verifyAccountOwnership(userId, input.accountId);

    return this.performanceRepository.upsertByAccountAndDate({
      accountId: input.accountId,
      date: normalizePerformanceDate(input.date),
      dailyReturnPercent: input.dailyReturnPercent,
      dailyProfit: input.dailyProfit,
      shareValue: input.shareValue,
      notes: input.notes,
    });
  }

  async update(
    userId: string,
    performanceId: string,
    input: UpdatePerformanceInput,
  ): Promise<PerformanceEntity> {
    const accountIds = await this.getUserAccountIds(userId);
    const performance = await this.performanceRepository.findByIdAndAccountIds(
      performanceId,
      accountIds,
    );
    if (!performance) {
      throw new NotFoundError('Rendimiento');
    }

    return this.performanceRepository.update(performanceId, {
      date: input.date ? normalizePerformanceDate(input.date) : undefined,
      dailyReturnPercent: input.dailyReturnPercent,
      dailyProfit: input.dailyProfit,
      shareValue: input.shareValue,
      notes: input.notes,
    });
  }

  async delete(userId: string, performanceId: string): Promise<void> {
    const accountIds = await this.getUserAccountIds(userId);
    const performance = await this.performanceRepository.findByIdAndAccountIds(
      performanceId,
      accountIds,
    );
    if (!performance) {
      throw new NotFoundError('Rendimiento');
    }
    await this.performanceRepository.delete(performanceId);
  }

  async getMonthly(
    userId: string,
    query: PerformancePeriodQueryInput,
  ): Promise<MonthlyPerformanceAggregate[]> {
    const accountIds = await this.getFilteredAccountIds(userId, query.accountId);
    return this.performanceRepository.getMonthlyAggregates(accountIds, query.year);
  }

  async getYearly(
    userId: string,
    query: PerformancePeriodQueryInput,
  ): Promise<YearlyPerformanceAggregate[]> {
    const accountIds = await this.getFilteredAccountIds(userId, query.accountId);
    return this.performanceRepository.getYearlyAggregates(accountIds);
  }

  private async getUserAccountIds(userId: string): Promise<string[]> {
    const accounts = await this.accountRepository.findByUserId(userId);
    return accounts.map((a) => a.id);
  }

  private async getFilteredAccountIds(userId: string, accountId?: string): Promise<string[]> {
    if (accountId) {
      await this.verifyAccountOwnership(userId, accountId);
      return [accountId];
    }
    return this.getUserAccountIds(userId);
  }

  private async verifyAccountOwnership(userId: string, accountId: string): Promise<void> {
    const account = await this.accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new NotFoundError('Cuenta');
    }
  }
}
