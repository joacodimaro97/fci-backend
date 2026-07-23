import { NotFoundError } from '../errors/AppError.js';
import type { CashSummaryResult, IntentReportResult } from '../models/index.js';
import type { ICashAccountRepository } from '../repositories/ICashAccountRepository.js';
import type { ICategoryRepository } from '../repositories/ICategoryRepository.js';
import type { ITransactionRepository } from '../repositories/ITransactionRepository.js';
import { CashTransactionType, ExpenseIntent } from '../types/enums.js';
import { endOfDay, parseDate, startOfDay } from '../utils/index.js';
import type {
  CashSummaryQueryInput,
  IntentReportQueryInput,
} from '../validators/cashSummary.validator.js';

const INTENT_ORDER: Array<ExpenseIntent | null> = [
  ExpenseIntent.NECESIDAD,
  ExpenseIntent.GUSTO,
  ExpenseIntent.IMPULSO,
  ExpenseIntent.CONVENIENCIA,
  null,
];

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
    const reimbursedByExpenseId = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.type === CashTransactionType.INCOME && tx.relatedExpenseId) {
        reimbursedByExpenseId.set(
          tx.relatedExpenseId,
          (reimbursedByExpenseId.get(tx.relatedExpenseId) ?? 0) + tx.amount,
        );
      }
    }

    let totalIncome = 0;
    let totalExpense = 0;
    let totalReimbursed = 0;
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

    const isSingleAccountView = Boolean(query.cashAccountId);

    for (const tx of transactions) {
      if (!isSingleAccountView && (tx.transferId || tx.fundingId || tx.installmentId)) {
        continue;
      }
      if (tx.type === CashTransactionType.INCOME) {
        totalIncome += tx.amount;
        if (tx.relatedExpenseId) {
          totalReimbursed += tx.amount;
        }
      } else {
        totalExpense += tx.amount;
      }

      const effectiveAmount =
        tx.type === CashTransactionType.EXPENSE
          ? Math.max(tx.amount - (reimbursedByExpenseId.get(tx.id) ?? 0), 0)
          : tx.amount;

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
      existing.total += effectiveAmount;
      existing.count += 1;
      byCategoryMap.set(tx.categoryId, existing);

      const parentAgg = byParentMap.get(rollupId) ?? {
        categoryId: rollupId,
        categoryName: rollupName,
        type: tx.type,
        total: 0,
        count: 0,
      };
      parentAgg.total += effectiveAmount;
      parentAgg.count += 1;
      byParentMap.set(rollupId, parentAgg);
    }

    const totalExpenseNet = Math.max(totalExpense - totalReimbursed, 0);

    return {
      openingBalance: round2(openingBalance),
      totalIncome: round2(totalIncome),
      totalExpense: round2(totalExpense),
      totalExpenseNet: round2(totalExpenseNet),
      totalReimbursed: round2(totalReimbursed),
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

  async getIntentReport(
    userId: string,
    query: IntentReportQueryInput,
  ): Promise<IntentReportResult> {
    const accounts = await this.resolveCashAccounts(userId, query.cashAccountId);
    const cashAccountIds = accounts.map((a) => a.id);
    const { startDate, endDate } = this.resolveIntentPeriod(query);

    const transactions = await this.transactionRepository.findByFilters({
      cashAccountIds,
      type: CashTransactionType.EXPENSE,
      startDate,
      endDate,
      excludeTransfers: !query.cashAccountId,
      excludeFundings: !query.cashAccountId,
      excludeInstallments: !query.cashAccountId,
    });

    const expenseIds = transactions.map((tx) => tx.id);
    const reimbursements =
      expenseIds.length === 0
        ? []
        : await this.transactionRepository.findByFilters({
            relatedExpenseIds: expenseIds,
            type: CashTransactionType.INCOME,
          });

    const reimbursedByExpenseId = new Map<string, number>();
    for (const tx of reimbursements) {
      if (!tx.relatedExpenseId) continue;
      reimbursedByExpenseId.set(
        tx.relatedExpenseId,
        (reimbursedByExpenseId.get(tx.relatedExpenseId) ?? 0) + tx.amount,
      );
    }

    const buckets = new Map<
      string,
      { intent: ExpenseIntent | null; total: number; totalGross: number; count: number }
    >();

    for (const intent of INTENT_ORDER) {
      buckets.set(intentKey(intent), {
        intent,
        total: 0,
        totalGross: 0,
        count: 0,
      });
    }

    let totalExpense = 0;
    let totalReimbursed = 0;

    for (const tx of transactions) {
      const reimbursed = reimbursedByExpenseId.get(tx.id) ?? 0;
      const net = Math.max(tx.amount - reimbursed, 0);
      totalExpense += tx.amount;
      totalReimbursed += reimbursed;

      const key = intentKey(tx.intent);
      const bucket = buckets.get(key) ?? {
        intent: tx.intent,
        total: 0,
        totalGross: 0,
        count: 0,
      };
      bucket.totalGross += tx.amount;
      bucket.total += net;
      bucket.count += 1;
      buckets.set(key, bucket);
    }

    const totalExpenseNet = Math.max(totalExpense - totalReimbursed, 0);

    const byIntent = INTENT_ORDER.map((intent) => {
      const bucket = buckets.get(intentKey(intent))!;
      return {
        intent: bucket.intent,
        total: round2(bucket.total),
        totalGross: round2(bucket.totalGross),
        count: bucket.count,
        percentage:
          totalExpenseNet > 0 ? round2((bucket.total / totalExpenseNet) * 100) : 0,
      };
    }).filter((bucket) => bucket.intent !== null || bucket.count > 0);

    return {
      startDate: startDate ? formatDateOnly(startDate) : null,
      endDate: endDate ? formatDateOnly(endDate) : null,
      totalExpense: round2(totalExpense),
      totalExpenseNet: round2(totalExpenseNet),
      totalReimbursed: round2(totalReimbursed),
      byIntent,
    };
  }

  private async resolveCashAccounts(userId: string, cashAccountId?: string) {
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

  private resolveIntentPeriod(query: IntentReportQueryInput): {
    startDate?: Date;
    endDate?: Date;
  } {
    if (query.startDate && query.endDate) {
      return {
        startDate: startOfDay(parseDate(query.startDate)),
        endDate: endOfDay(parseDate(query.endDate)),
      };
    }

    if (query.year === undefined && query.month === undefined) {
      return {};
    }

    const now = new Date();
    const year = query.year ?? now.getUTCFullYear();
    const month = query.month !== undefined ? query.month - 1 : 0;

    if (query.month !== undefined) {
      return {
        startDate: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
        endDate: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
      };
    }

    return {
      startDate: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
      endDate: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
    };
  }
}

function intentKey(intent: ExpenseIntent | null): string {
  return intent ?? '__null__';
}

function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
