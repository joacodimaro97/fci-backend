import { NotFoundError, ValidationError } from '../errors/AppError.js';
import type {
  BudgetAnalysis,
  BudgetCategoryInfo,
  BudgetEntity,
  BudgetStatus,
  BudgetWithAnalysis,
  CashAccountEntity,
  CategoryEntity,
} from '../models/index.js';
import type { IBudgetRepository } from '../repositories/IBudgetRepository.js';
import type { ICashAccountRepository } from '../repositories/ICashAccountRepository.js';
import type { ICategoryRepository } from '../repositories/ICategoryRepository.js';
import type { ITransactionRepository } from '../repositories/ITransactionRepository.js';
import { CashTransactionType } from '../types/enums.js';
import { endOfDay, parseDate, startOfDay, todayCalendarDate } from '../utils/index.js';
import type {
  CreateBudgetInput,
  UpdateBudgetInput,
} from '../validators/budget.validator.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export class BudgetService {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly cashAccountRepository: ICashAccountRepository,
    private readonly transactionRepository: ITransactionRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async getAll(userId: string): Promise<BudgetWithAnalysis[]> {
    const budgets = await this.budgetRepository.findByUserId(userId);
    const accounts = await this.cashAccountRepository.findByUserId(userId);
    const categories = await this.categoryRepository.findByFilters({ userId });
    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const result: BudgetWithAnalysis[] = [];
    for (const budget of budgets) {
      const account = budget.cashAccountId
        ? accountMap.get(budget.cashAccountId) ?? null
        : null;
      if (budget.cashAccountId && !account) {
        continue;
      }
      result.push(await this.buildWithAnalysis(budget, account, categoryMap, categories));
    }
    return result;
  }

  async getById(userId: string, budgetId: string): Promise<BudgetWithAnalysis> {
    const budget = await this.budgetRepository.findByIdAndUserId(budgetId, userId);
    if (!budget) {
      throw new NotFoundError('Presupuesto');
    }

    const account = budget.cashAccountId
      ? await this.cashAccountRepository.findByIdAndUserId(budget.cashAccountId, userId)
      : null;
    if (budget.cashAccountId && !account) {
      throw new NotFoundError('Cuenta de efectivo');
    }

    const categories = await this.categoryRepository.findByFilters({ userId });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    return this.buildWithAnalysis(budget, account, categoryMap, categories);
  }

  async create(userId: string, input: CreateBudgetInput): Promise<BudgetWithAnalysis> {
    const account = await this.resolveOptionalAccount(userId, input.cashAccountId);
    const selectedCategories = await this.resolveCategories(userId, input.categoryIds);

    const startDate = input.startDate ? parseDate(input.startDate) : todayCalendarDate();
    const endDate = parseDate(input.endDate);
    this.assertDateRange(startDate, endDate);

    const amount = await this.resolveAmount(input.amount, account, selectedCategories.length > 0);

    const budget = await this.budgetRepository.create({
      userId,
      cashAccountId: account?.id ?? null,
      name: input.name,
      amount,
      startDate,
      endDate,
      categoryIds: selectedCategories.map((c) => c.id),
    });

    const allCategories = await this.categoryRepository.findByFilters({ userId });
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
    return this.buildWithAnalysis(budget, account, categoryMap, allCategories);
  }

  async update(
    userId: string,
    budgetId: string,
    input: UpdateBudgetInput,
  ): Promise<BudgetWithAnalysis> {
    const budget = await this.budgetRepository.findByIdAndUserId(budgetId, userId);
    if (!budget) {
      throw new NotFoundError('Presupuesto');
    }

    let nextCashAccountId = budget.cashAccountId;
    if (input.cashAccountId !== undefined) {
      if (input.cashAccountId === null) {
        nextCashAccountId = null;
      } else {
        const target = await this.cashAccountRepository.findByIdAndUserId(
          input.cashAccountId,
          userId,
        );
        if (!target) {
          throw new NotFoundError('Cuenta de efectivo');
        }
        nextCashAccountId = target.id;
      }
    }

    let nextCategoryIds = budget.categoryIds;
    if (input.categoryIds !== undefined) {
      const selected = await this.resolveCategories(userId, input.categoryIds);
      nextCategoryIds = selected.map((c) => c.id);
    }

    if (!nextCashAccountId && nextCategoryIds.length === 0) {
      throw new ValidationError('El presupuesto debe tener una cuenta y/o al menos una categoría');
    }

    if (nextCategoryIds.length > 0 && input.amount === undefined && budget.amount <= 0) {
      throw new ValidationError('El monto es requerido cuando el presupuesto tiene categorías');
    }

    const startDate = input.startDate ? parseDate(input.startDate) : budget.startDate;
    const endDate = input.endDate ? parseDate(input.endDate) : budget.endDate;
    this.assertDateRange(startDate, endDate);

    const updated = await this.budgetRepository.update(budgetId, {
      cashAccountId: input.cashAccountId !== undefined ? nextCashAccountId : undefined,
      name: input.name,
      amount: input.amount,
      startDate: input.startDate ? startDate : undefined,
      endDate: input.endDate ? endDate : undefined,
      categoryIds: input.categoryIds !== undefined ? nextCategoryIds : undefined,
    });

    const account = updated.cashAccountId
      ? await this.cashAccountRepository.findByIdAndUserId(updated.cashAccountId, userId)
      : null;
    if (updated.cashAccountId && !account) {
      throw new NotFoundError('Cuenta de efectivo');
    }

    const allCategories = await this.categoryRepository.findByFilters({ userId });
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
    return this.buildWithAnalysis(updated, account, categoryMap, allCategories);
  }

  async delete(userId: string, budgetId: string): Promise<void> {
    const budget = await this.budgetRepository.findByIdAndUserId(budgetId, userId);
    if (!budget) {
      throw new NotFoundError('Presupuesto');
    }
    await this.budgetRepository.delete(budgetId);
  }

  private async buildWithAnalysis(
    budget: BudgetEntity,
    account: CashAccountEntity | null,
    categoryMap: Map<string, CategoryEntity>,
    allCategories: CategoryEntity[],
  ): Promise<BudgetWithAnalysis> {
    const categories: BudgetCategoryInfo[] = budget.categoryIds
      .map((id) => categoryMap.get(id))
      .filter((c): c is CategoryEntity => Boolean(c))
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color,
        parentId: c.parentId,
      }));

    const trackedCategoryIds = this.expandCategoryIds(budget.categoryIds, allCategories);
    const analysis = await this.analyze(budget, trackedCategoryIds);

    return {
      ...budget,
      cashAccount: account
        ? { id: account.id, name: account.name, currency: account.currency }
        : null,
      categories,
      analysis,
    };
  }

  private async analyze(
    budget: BudgetEntity,
    trackedCategoryIds: string[],
  ): Promise<BudgetAnalysis> {
    const start = startOfDay(budget.startDate);
    const end = startOfDay(budget.endDate);
    const today = startOfDay(todayCalendarDate());

    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
    const dailyAllowance = budget.amount / totalDays;

    let daysRemaining: number;
    if (today.getTime() < start.getTime()) {
      daysRemaining = totalDays;
    } else if (today.getTime() > end.getTime()) {
      daysRemaining = 0;
    } else {
      daysRemaining = Math.round((end.getTime() - today.getTime()) / DAY_MS) + 1;
    }
    const daysElapsed = totalDays - daysRemaining;

    const spentUntil = today.getTime() > end.getTime() ? end : today;
    const spent = await this.computeSpent(
      budget.cashAccountId,
      trackedCategoryIds,
      start,
      endOfDay(spentUntil),
    );

    const remaining = budget.amount - spent;
    const overspent = remaining < 0;

    let daysThroughToday: number;
    if (today.getTime() < start.getTime()) {
      daysThroughToday = 0;
    } else if (today.getTime() > end.getTime()) {
      daysThroughToday = totalDays;
    } else {
      daysThroughToday = daysElapsed + 1;
    }

    const expectedToDate = dailyAllowance * daysThroughToday;
    const difference = expectedToDate - spent;
    const averageDailySpent = daysThroughToday > 0 ? spent / daysThroughToday : 0;
    const projectedTotal = averageDailySpent * totalDays;
    const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    const suggestedDailyRemaining =
      daysRemaining > 0 ? Math.max(0, remaining) / daysRemaining : 0;

    const status = this.resolveStatus({
      today,
      start,
      end,
      spent,
      expectedToDate,
      overspent,
    });

    return {
      totalDays,
      daysElapsed,
      daysRemaining,
      dailyAllowance: round2(dailyAllowance),
      spent: round2(spent),
      remaining: round2(remaining),
      expectedToDate: round2(expectedToDate),
      difference: round2(difference),
      suggestedDailyRemaining: round2(suggestedDailyRemaining),
      averageDailySpent: round2(averageDailySpent),
      projectedTotal: round2(projectedTotal),
      percentUsed: round2(percentUsed),
      overspent,
      status,
    };
  }

  private resolveStatus(params: {
    today: Date;
    start: Date;
    end: Date;
    spent: number;
    expectedToDate: number;
    overspent: boolean;
  }): BudgetStatus {
    const { today, start, end, spent, expectedToDate, overspent } = params;

    if (today.getTime() < start.getTime()) {
      return 'NOT_STARTED';
    }
    if (today.getTime() > end.getTime()) {
      return 'COMPLETED';
    }
    if (overspent || spent > expectedToDate * 1.05) {
      return 'OVER_BUDGET';
    }
    if (spent < expectedToDate * 0.95) {
      return 'UNDER_BUDGET';
    }
    return 'ON_TRACK';
  }

  private async resolveOptionalAccount(
    userId: string,
    cashAccountId?: string | null,
  ): Promise<CashAccountEntity | null> {
    if (!cashAccountId) {
      return null;
    }
    const account = await this.cashAccountRepository.findByIdAndUserId(cashAccountId, userId);
    if (!account) {
      throw new NotFoundError('Cuenta de efectivo');
    }
    return account;
  }

  private async resolveCategories(
    userId: string,
    categoryIds?: string[],
  ): Promise<CategoryEntity[]> {
    if (!categoryIds?.length) {
      return [];
    }

    const uniqueIds = [...new Set(categoryIds)];
    const selected: CategoryEntity[] = [];

    for (const categoryId of uniqueIds) {
      const category = await this.categoryRepository.findByIdAndUserId(categoryId, userId);
      if (!category) {
        throw new NotFoundError('Categoría');
      }
      if (category.type !== CashTransactionType.EXPENSE) {
        throw new ValidationError(
          `La categoría "${category.name}" debe ser de tipo EXPENSE para un presupuesto`,
        );
      }
      selected.push(category);
    }

    return selected;
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

  private async resolveAmount(
    amount: number | undefined,
    account: CashAccountEntity | null,
    hasCategories: boolean,
  ): Promise<number> {
    if (amount !== undefined) {
      return amount;
    }

    if (hasCategories) {
      throw new ValidationError('El monto es requerido cuando el presupuesto tiene categorías');
    }

    if (!account) {
      throw new ValidationError('Indicá un monto o una cuenta de efectivo con saldo');
    }

    const balance = await this.computeAccountBalance(account);
    if (balance <= 0) {
      throw new ValidationError(
        'El monto del presupuesto debe ser positivo. La cuenta no tiene saldo disponible; indicá un monto manualmente.',
      );
    }
    return balance;
  }

  private assertDateRange(startDate: Date, endDate: Date): void {
    if (endDate.getTime() < startDate.getTime()) {
      throw new ValidationError('La fecha final debe ser posterior o igual a la inicial');
    }
  }

  private async computeAccountBalance(account: CashAccountEntity): Promise<number> {
    const transactions = await this.transactionRepository.findByFilters({
      cashAccountId: account.id,
    });

    let balance = account.openingBalance;
    for (const tx of transactions) {
      if (tx.type === CashTransactionType.INCOME) {
        balance += tx.amount;
      } else {
        balance -= tx.amount;
      }
    }
    return round2(balance);
  }

  private async computeSpent(
    cashAccountId: string | null,
    categoryIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const expenseTransactions = await this.transactionRepository.findByFilters({
      cashAccountId: cashAccountId ?? undefined,
      categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      type: CashTransactionType.EXPENSE,
      startDate,
      endDate,
      excludeTransfers: true,
      excludeFundings: true,
    });

    if (expenseTransactions.length === 0) {
      return 0;
    }

    const reimbursements = await this.transactionRepository.findByFilters({
      cashAccountId: cashAccountId ?? undefined,
      relatedExpenseIds: expenseTransactions.map((tx) => tx.id),
      type: CashTransactionType.INCOME,
      startDate,
      endDate,
      excludeTransfers: true,
      excludeFundings: true,
    });

    const totalExpense = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalReimbursed = reimbursements.reduce((sum, tx) => sum + tx.amount, 0);

    return Math.max(totalExpense - totalReimbursed, 0);
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
