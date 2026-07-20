import { NotFoundError, ValidationError } from '../errors/AppError.js';
import type {
  CategoryEntity,
  TransactionEntity,
  TransactionListResult,
  TransactionListStats,
  TransactionWeekHighlight,
  TransactionWeekStats,
} from '../models/index.js';
import type { ICashAccountRepository } from '../repositories/ICashAccountRepository.js';
import type { ICategoryRepository } from '../repositories/ICategoryRepository.js';
import type { ITransactionRepository } from '../repositories/ITransactionRepository.js';
import { CashTransactionType } from '../types/enums.js';
import { endOfDay, parseDate, startOfDay } from '../utils/index.js';
import type {
  CreateTransactionInput,
  TransactionQueryInput,
  UpdateTransactionInput,
} from '../validators/transaction.validator.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_LABELS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

export class TransactionService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly cashAccountRepository: ICashAccountRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async getAll(userId: string, query: TransactionQueryInput): Promise<TransactionListResult> {
    const cashAccountIds = await this.getFilteredCashAccountIds(userId, query.cashAccountId);
    const categoryIds = await this.resolveCategoryFilter(userId, query);

    const items = await this.transactionRepository.findByFilters({
      cashAccountIds,
      categoryIds,
      type: query.type,
      startDate: query.startDate ? startOfDay(parseDate(query.startDate)) : undefined,
      endDate: query.endDate ? endOfDay(parseDate(query.endDate)) : undefined,
      excludeTransfers: query.excludeTransfers,
      excludeFundings: query.excludeFundings,
    });

    return {
      items,
      stats: this.buildStats(items, query),
    };
  }

  async create(userId: string, input: CreateTransactionInput): Promise<TransactionEntity> {
    await this.verifyCashAccountOwnership(userId, input.cashAccountId);
    await this.ensureCategoryMatchesType(userId, input.categoryId, input.type);

    return this.transactionRepository.create({
      cashAccountId: input.cashAccountId,
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
      date: parseDate(input.date),
      description: input.description,
    });
  }

  async update(
    userId: string,
    transactionId: string,
    input: UpdateTransactionInput,
  ): Promise<TransactionEntity> {
    const cashAccountIds = await this.getUserCashAccountIds(userId);
    const transaction = await this.transactionRepository.findByIdAndCashAccountIds(
      transactionId,
      cashAccountIds,
    );
    if (!transaction) {
      throw new NotFoundError('Transacción');
    }

    if (transaction.transferId) {
      throw new ValidationError(
        'Esta transacción pertenece a una transferencia. Eliminá la transferencia en /cash/transfers',
      );
    }

    if (transaction.fundingId) {
      throw new ValidationError(
        'Esta transacción pertenece a un movimiento efectivo↔inversión. Eliminá el registro en /fundings',
      );
    }

    const nextCashAccountId = input.cashAccountId ?? transaction.cashAccountId;
    const nextCategoryId = input.categoryId ?? transaction.categoryId;
    const nextType = input.type ?? transaction.type;

    if (input.cashAccountId) {
      await this.verifyCashAccountOwnership(userId, input.cashAccountId);
    }

    await this.ensureCategoryMatchesType(userId, nextCategoryId, nextType);

    return this.transactionRepository.update(transactionId, {
      cashAccountId: nextCashAccountId,
      categoryId: nextCategoryId,
      type: nextType,
      amount: input.amount,
      date: input.date ? parseDate(input.date) : undefined,
      description: input.description,
    });
  }

  async delete(userId: string, transactionId: string): Promise<void> {
    const cashAccountIds = await this.getUserCashAccountIds(userId);
    const transaction = await this.transactionRepository.findByIdAndCashAccountIds(
      transactionId,
      cashAccountIds,
    );
    if (!transaction) {
      throw new NotFoundError('Transacción');
    }

    if (transaction.transferId) {
      throw new ValidationError(
        'Esta transacción pertenece a una transferencia. Eliminá la transferencia en /cash/transfers',
      );
    }

    if (transaction.fundingId) {
      throw new ValidationError(
        'Esta transacción pertenece a un movimiento efectivo↔inversión. Eliminá el registro en /fundings',
      );
    }

    await this.transactionRepository.delete(transactionId);
  }

  private buildStats(
    items: TransactionEntity[],
    query: TransactionQueryInput,
  ): TransactionListStats {
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    for (const tx of items) {
      if (tx.type === CashTransactionType.INCOME) {
        totalIncome += tx.amount;
        incomeCount += 1;
      } else {
        totalExpense += tx.amount;
        expenseCount += 1;
      }
    }

    const { startDate, endDate, totalDays } = this.resolveStatsRange(items, query);
    const { byWeek, highestExpenseWeek, lowestExpenseWeek } = this.buildWeeklyBreakdown(
      items,
      query,
    );

    return {
      totalIncome: round2(totalIncome),
      totalExpense: round2(totalExpense),
      net: round2(totalIncome - totalExpense),
      transactionCount: items.length,
      incomeCount,
      expenseCount,
      startDate,
      endDate,
      totalDays,
      averageDailyExpense: totalDays > 0 ? round2(totalExpense / totalDays) : 0,
      averageDailyIncome: totalDays > 0 ? round2(totalIncome / totalDays) : 0,
      byWeek,
      highestExpenseWeek,
      lowestExpenseWeek,
    };
  }

  /**
   * Rango: query start+end inclusive; si falta alguno se completa con min/max de items;
   * sin fechas ni items → totalDays 0 y fechas null.
   */
  private resolveStatsRange(
    items: TransactionEntity[],
    query: TransactionQueryInput,
  ): { startDate: string | null; endDate: string | null; totalDays: number } {
    let start = query.startDate ? startOfDay(parseDate(query.startDate)) : null;
    let end = query.endDate ? startOfDay(parseDate(query.endDate)) : null;

    if (!start || !end) {
      if (items.length === 0) {
        return {
          startDate: start ? formatDateOnly(start) : null,
          endDate: end ? formatDateOnly(end) : null,
          totalDays: 0,
        };
      }

      let minTime = Infinity;
      let maxTime = -Infinity;
      for (const tx of items) {
        const t = startOfDay(tx.date).getTime();
        if (t < minTime) minTime = t;
        if (t > maxTime) maxTime = t;
      }

      start = start ?? new Date(minTime);
      end = end ?? new Date(maxTime);
    }

    const totalDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);

    return {
      startDate: formatDateOnly(start),
      endDate: formatDateOnly(end),
      totalDays,
    };
  }

  /** Sin startDate+endDate en query → byWeek vacío y highlights null. */
  private buildWeeklyBreakdown(
    items: TransactionEntity[],
    query: TransactionQueryInput,
  ): {
    byWeek: TransactionWeekStats[];
    highestExpenseWeek: TransactionWeekHighlight | null;
    lowestExpenseWeek: TransactionWeekHighlight | null;
  } {
    if (!query.startDate || !query.endDate) {
      return { byWeek: [], highestExpenseWeek: null, lowestExpenseWeek: null };
    }

    const rangeStart = startOfDay(parseDate(query.startDate));
    const rangeEnd = startOfDay(parseDate(query.endDate));
    if (rangeEnd.getTime() < rangeStart.getTime()) {
      return { byWeek: [], highestExpenseWeek: null, lowestExpenseWeek: null };
    }

    const byWeek: TransactionWeekStats[] = [];
    let weekMonday = startOfWeekMonday(rangeStart);

    while (weekMonday.getTime() <= rangeEnd.getTime()) {
      const weekSunday = addDays(weekMonday, 6);
      const segmentStart =
        weekMonday.getTime() > rangeStart.getTime() ? weekMonday : rangeStart;
      const segmentEnd = weekSunday.getTime() < rangeEnd.getTime() ? weekSunday : rangeEnd;
      const dayCount =
        Math.round((segmentEnd.getTime() - segmentStart.getTime()) / DAY_MS) + 1;

      let weekExpense = 0;
      let weekIncome = 0;
      let weekExpenseCount = 0;

      for (const tx of items) {
        const txDay = startOfDay(tx.date).getTime();
        if (txDay < segmentStart.getTime() || txDay > segmentEnd.getTime()) {
          continue;
        }
        if (tx.type === CashTransactionType.INCOME) {
          weekIncome += tx.amount;
        } else {
          weekExpense += tx.amount;
          weekExpenseCount += 1;
        }
      }

      byWeek.push({
        weekStart: formatDateOnly(segmentStart),
        weekEnd: formatDateOnly(segmentEnd),
        label: formatWeekLabel(segmentStart, segmentEnd),
        dayCount,
        partial: dayCount < 7,
        totalExpense: round2(weekExpense),
        totalIncome: round2(weekIncome),
        expenseCount: weekExpenseCount,
        averageDailyExpense: dayCount > 0 ? round2(weekExpense / dayCount) : 0,
      });

      weekMonday = addDays(weekMonday, 7);
    }

    const weeksWithExpense = byWeek.filter((w) => w.totalExpense > 0);
    if (weeksWithExpense.length === 0) {
      return { byWeek, highestExpenseWeek: null, lowestExpenseWeek: null };
    }

    return {
      byWeek,
      highestExpenseWeek: toWeekHighlight(pickExtremeWeek(weeksWithExpense, 'highest')),
      lowestExpenseWeek: toWeekHighlight(pickExtremeWeek(weeksWithExpense, 'lowest')),
    };
  }

  /**
   * categoryIds (no vacío) tiene prioridad y no expande padres.
   * Solo categoryId → expande hijas si es padre.
   */
  private async resolveCategoryFilter(
    userId: string,
    query: TransactionQueryInput,
  ): Promise<string[] | undefined> {
    if (query.categoryIds?.length) {
      for (const categoryId of query.categoryIds) {
        const category = await this.categoryRepository.findByIdAndUserId(categoryId, userId);
        if (!category) {
          throw new NotFoundError('Categoría');
        }
      }
      return query.categoryIds;
    }

    if (query.categoryId) {
      const category = await this.categoryRepository.findByIdAndUserId(query.categoryId, userId);
      if (!category) {
        throw new NotFoundError('Categoría');
      }
      const allCategories = await this.categoryRepository.findByFilters({ userId });
      return this.expandCategoryIds([query.categoryId], allCategories);
    }

    return undefined;
  }

  private async getUserCashAccountIds(userId: string): Promise<string[]> {
    const accounts = await this.cashAccountRepository.findByUserId(userId);
    return accounts.map((a) => a.id);
  }

  private async getFilteredCashAccountIds(
    userId: string,
    cashAccountId?: string,
  ): Promise<string[]> {
    if (cashAccountId) {
      await this.verifyCashAccountOwnership(userId, cashAccountId);
      return [cashAccountId];
    }
    return this.getUserCashAccountIds(userId);
  }

  private async verifyCashAccountOwnership(userId: string, cashAccountId: string): Promise<void> {
    const account = await this.cashAccountRepository.findByIdAndUserId(cashAccountId, userId);
    if (!account) {
      throw new NotFoundError('Cuenta de efectivo');
    }
  }

  private async ensureCategoryMatchesType(
    userId: string,
    categoryId: string,
    type: CashTransactionType,
  ): Promise<void> {
    const category = await this.categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!category) {
      throw new NotFoundError('Categoría');
    }
    if (category.type !== type) {
      throw new ValidationError(
        `La categoría "${category.name}" es de tipo ${category.type}, no ${type}`,
      );
    }
  }

  private expandCategoryIds(
    selectedIds: string[],
    allCategories: CategoryEntity[],
  ): string[] {
    if (selectedIds.length === 0) {
      return [];
    }

    const ids = new Set(selectedIds);
    for (const category of allCategories) {
      if (category.parentId && ids.has(category.parentId)) {
        ids.add(category.id);
      }
    }
    return [...ids];
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Lunes 00:00 UTC de la semana que contiene `date`. */
function startOfWeekMonday(date: Date): Date {
  const day = startOfDay(date);
  const weekday = day.getUTCDay(); // 0=dom … 1=lun
  const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
  return addDays(day, offsetToMonday);
}

function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  const startDay = weekStart.getUTCDate();
  const endDay = weekEnd.getUTCDate();
  const startMonth = MONTH_LABELS[weekStart.getUTCMonth()]!;
  const endMonth = MONTH_LABELS[weekEnd.getUTCMonth()]!;

  if (startMonth === endMonth) {
    return `${startDay}–${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth}–${endDay} ${endMonth}`;
}

function pickExtremeWeek(
  weeks: TransactionWeekStats[],
  mode: 'highest' | 'lowest',
): TransactionWeekStats {
  return weeks.reduce((best, current) => {
    const avgDiff = current.averageDailyExpense - best.averageDailyExpense;
    if (mode === 'highest') {
      if (avgDiff > 0) return current;
      if (avgDiff < 0) return best;
      if (current.totalExpense !== best.totalExpense) {
        return current.totalExpense > best.totalExpense ? current : best;
      }
      return current.weekStart > best.weekStart ? current : best;
    }

    if (avgDiff < 0) return current;
    if (avgDiff > 0) return best;
    if (current.totalExpense !== best.totalExpense) {
      return current.totalExpense < best.totalExpense ? current : best;
    }
    return current.weekStart > best.weekStart ? current : best;
  });
}

function toWeekHighlight(week: TransactionWeekStats): TransactionWeekHighlight {
  return {
    weekStart: week.weekStart,
    totalExpense: week.totalExpense,
    averageDailyExpense: week.averageDailyExpense,
  };
}
