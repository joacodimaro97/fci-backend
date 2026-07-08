import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreatePerformanceData,
  MonthlyPerformanceAggregate,
  PerformanceEntity,
  UpdatePerformanceData,
  UpsertPerformanceResult,
  YearlyPerformanceAggregate,
} from '../../models/index.js';
import type { IPerformanceRepository, PerformanceFilters } from '../IPerformanceRepository.js';

export class PrismaPerformanceRepository implements IPerformanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreatePerformanceData): Promise<PerformanceEntity> {
    return this.prisma.dailyPerformance.create({ data });
  }

  async upsertByAccountAndDate(data: CreatePerformanceData): Promise<UpsertPerformanceResult> {
    const existing = await this.prisma.dailyPerformance.findUnique({
      where: {
        accountId_date: {
          accountId: data.accountId,
          date: data.date,
        },
      },
    });

    const performance = await this.prisma.dailyPerformance.upsert({
      where: {
        accountId_date: {
          accountId: data.accountId,
          date: data.date,
        },
      },
      create: data,
      update: {
        dailyReturnPercent: data.dailyReturnPercent,
        dailyProfit: data.dailyProfit,
        shareValue: data.shareValue,
        notes: data.notes,
      },
    });

    return {
      performance,
      created: existing === null,
    };
  }

  async findById(id: string): Promise<PerformanceEntity | null> {
    return this.prisma.dailyPerformance.findUnique({ where: { id } });
  }

  async findByFilters(filters: PerformanceFilters): Promise<PerformanceEntity[]> {
    const where = this.buildWhere(filters);
    return this.prisma.dailyPerformance.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async findByIdAndAccountIds(
    id: string,
    accountIds: string[],
  ): Promise<PerformanceEntity | null> {
    return this.prisma.dailyPerformance.findFirst({
      where: { id, accountId: { in: accountIds } },
    });
  }

  async update(id: string, data: UpdatePerformanceData): Promise<PerformanceEntity> {
    return this.prisma.dailyPerformance.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.dailyPerformance.delete({ where: { id } });
  }

  async getMonthlyAggregates(
    accountIds: string[],
    year?: number,
  ): Promise<MonthlyPerformanceAggregate[]> {
    const performances = await this.prisma.dailyPerformance.findMany({
      where: {
        accountId: { in: accountIds },
        ...(year ? { date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } } : {}),
      },
      orderBy: { date: 'asc' },
    });

    const monthlyMap = new Map<string, { returns: number[]; profits: number[] }>();

    for (const p of performances) {
      const key = `${p.date.getFullYear()}-${p.date.getMonth()}`;
      const existing = monthlyMap.get(key) ?? { returns: [], profits: [] };
      existing.returns.push(p.dailyReturnPercent);
      existing.profits.push(p.dailyProfit);
      monthlyMap.set(key, existing);
    }

    const result: MonthlyPerformanceAggregate[] = [];
    for (const [key, data] of monthlyMap) {
      const [yearStr, monthStr] = key.split('-');
      const compounded = data.returns.reduce((acc, r) => acc * (1 + r / 100), 1);
      result.push({
        year: Number(yearStr),
        month: Number(monthStr) + 1,
        totalReturnPercent: (compounded - 1) * 100,
        totalProfit: data.profits.reduce((sum, p) => sum + p, 0),
        days: data.returns.length,
      });
    }

    return result.sort((a, b) => a.year - b.year || a.month - b.month);
  }

  async getYearlyAggregates(accountIds: string[]): Promise<YearlyPerformanceAggregate[]> {
    const performances = await this.prisma.dailyPerformance.findMany({
      where: { accountId: { in: accountIds } },
      orderBy: { date: 'asc' },
    });

    const yearlyMap = new Map<number, { returns: number[]; profits: number[] }>();

    for (const p of performances) {
      const year = p.date.getFullYear();
      const existing = yearlyMap.get(year) ?? { returns: [], profits: [] };
      existing.returns.push(p.dailyReturnPercent);
      existing.profits.push(p.dailyProfit);
      yearlyMap.set(year, existing);
    }

    const result: YearlyPerformanceAggregate[] = [];
    for (const [year, data] of yearlyMap) {
      const compounded = data.returns.reduce((acc, r) => acc * (1 + r / 100), 1);
      result.push({
        year,
        totalReturnPercent: (compounded - 1) * 100,
        totalProfit: data.profits.reduce((sum, p) => sum + p, 0),
        days: data.returns.length,
      });
    }

    return result.sort((a, b) => a.year - b.year);
  }

  private buildWhere(filters: PerformanceFilters): Prisma.DailyPerformanceWhereInput {
    const where: Prisma.DailyPerformanceWhereInput = {};

    if (filters.accountId) {
      where.accountId = filters.accountId;
    } else if (filters.accountIds) {
      where.accountId = { in: filters.accountIds };
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    return where;
  }
}
