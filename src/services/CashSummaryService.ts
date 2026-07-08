import { NotFoundError } from '../errors/AppError.js';
import type { CashSummaryResult } from '../models/index.js';
import type { ICashAccountRepository } from '../repositories/ICashAccountRepository.js';
import type { ICategoryRepository } from '../repositories/ICategoryRepository.js';
import type { ITransactionRepository } from '../repositories/ITransactionRepository.js';
import { CashTransactionType } from '../types/enums.js';
import type { CashSummaryQueryInput } from '../validators/cashSummary.validator.js';

export class CashSummaryService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly cashAccountRepository: ICashAccountRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async getSummary(userId: string, query: CashSummaryQueryInput): Promise<CashSummaryResult> {
    const accounts = await this.resolveCashAccounts(userId, query.cashAccountId);
    const cashAccountIds = accounts.map((a) => a.id);
    const openingBalance = accounts.reduce((sum, a) => sum + a.openingBalance, 0);

    const { startDate, endDate } = this.resolvePeriod(query);

    const transactions = await this.transactionRepository.findByFilters({
      cashAccountIds,
      startDate,
      endDate,
    });

    const categories = await this.categoryRepository.findByFilters({ userId });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    let totalIncome = 0;
    let totalExpense = 0;
    const byCategoryMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        parentCategoryId: string | null;
        parentCategoryName: string | null;
        type: CashTransactionType;
        total: number;
        count: number;
      }
    >();
    const byParentMap = new Map<
      string,
      { categoryId: string; categoryName: string; type: CashTransactionType; total: number; count: number }
    >();

    for (const tx of transactions) {
      if (tx.type === CashTransactionType.INCOME) {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }

      const category = categoryMap.get(tx.categoryId);
      const parent = category?.parentId ? categoryMap.get(category.parentId) : undefined;
      const parentCategoryId = category?.parentId ?? null;
      const parentCategoryName = parent?.name ?? null;
      const rollupId = parentCategoryId ?? tx.categoryId;
      const rollupName = parentCategoryName ?? category?.name ?? 'Sin categoría';

      const existing = byCategoryMap.get(tx.categoryId) ?? {
        categoryId: tx.categoryId,
        categoryName: category?.name ?? 'Sin categoría',
        parentCategoryId,
        parentCategoryName,
        type: tx.type,
        total: 0,
        count: 0,
      };
      existing.total += tx.amount;
      existing.count += 1;
      byCategoryMap.set(tx.categoryId, existing);

      const parentAgg = byParentMap.get(rollupId) ?? {
        categoryId: rollupId,
        categoryName: rollupName,
        type: tx.type,
        total: 0,
        count: 0,
      };
      parentAgg.total += tx.amount;
      parentAgg.count += 1;
      byParentMap.set(rollupId, parentAgg);
    }

    return {
      openingBalance: round2(openingBalance),
      totalIncome: round2(totalIncome),
      totalExpense: round2(totalExpense),
      balance: round2(openingBalance + totalIncome - totalExpense),
      byCategory: Array.from(byCategoryMap.values())
        .map((item) => ({
          ...item,
          total: round2(item.total),
        }))
        .sort((a, b) => b.total - a.total),
      byParentCategory: Array.from(byParentMap.values())
        .map((item) => ({
          ...item,
          total: round2(item.total),
        }))
        .sort((a, b) => b.total - a.total),
    };
  }

  private async resolveCashAccounts(
    userId: string,
    cashAccountId?: string,
  ) {
    if (cashAccountId) {
      const account = await this.cashAccountRepository.findByIdAndUserId(cashAccountId, userId);
      if (!account) {
        throw new NotFoundError('Cuenta de efectivo');
      }
      return [account];
    }

    return this.cashAccountRepository.findByUserId(userId);
  }

  private resolvePeriod(query: CashSummaryQueryInput): {
    startDate?: Date;
    endDate?: Date;
  } {
    if (query.year === undefined && query.month === undefined) {
      return {};
    }

    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const month = query.month !== undefined ? query.month - 1 : 0;

    if (query.month !== undefined) {
      return {
        startDate: new Date(year, month, 1, 0, 0, 0, 0),
        endDate: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
    }

    return {
      startDate: new Date(year, 0, 1, 0, 0, 0, 0),
      endDate: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
