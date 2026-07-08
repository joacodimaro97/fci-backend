import { calculateStatistics } from '../finance/statisticsEngine.js';
import type { StatisticsResult } from '../finance/statisticsEngine.js';
import { NotFoundError } from '../errors/AppError.js';
import type { IAccountRepository } from '../repositories/IAccountRepository.js';
import type { IMovementRepository } from '../repositories/IMovementRepository.js';
import type { IPerformanceRepository } from '../repositories/IPerformanceRepository.js';
import { parseDate } from '../utils/index.js';
import type { StatisticsQueryInput } from '../validators/statistics.validator.js';

export class StatisticsService {
  constructor(
    private readonly performanceRepository: IPerformanceRepository,
    private readonly movementRepository: IMovementRepository,
    private readonly accountRepository: IAccountRepository,
  ) {}

  async getStatistics(userId: string, query: StatisticsQueryInput): Promise<StatisticsResult> {
    const accountIds = await this.getFilteredAccountIds(userId, query.accountId);

    const performances = await this.performanceRepository.findByFilters({
      accountIds,
      startDate: query.startDate ? parseDate(query.startDate) : undefined,
      endDate: query.endDate ? parseDate(query.endDate) : undefined,
    });

    const movements = await this.movementRepository.findByFilters({
      accountIds,
      startDate: query.startDate ? parseDate(query.startDate) : undefined,
      endDate: query.endDate ? parseDate(query.endDate) : undefined,
    });

    const currentCapital =
      performances.length > 0 ? performances[performances.length - 1]!.shareValue : undefined;

    return calculateStatistics({
      performances: performances.map((p) => ({
        date: p.date,
        dailyReturnPercent: p.dailyReturnPercent,
        dailyProfit: p.dailyProfit,
        shareValue: p.shareValue,
      })),
      movements: movements.map((m) => ({
        type: m.type,
        amount: m.amount,
        date: m.date,
      })),
      currentCapital,
    });
  }

  private async getFilteredAccountIds(userId: string, accountId?: string): Promise<string[]> {
    if (accountId) {
      const account = await this.accountRepository.findByIdAndUserId(accountId, userId);
      if (!account) {
        throw new NotFoundError('Cuenta');
      }
      return [accountId];
    }
    const accounts = await this.accountRepository.findByUserId(userId);
    return accounts.map((a) => a.id);
  }
}
