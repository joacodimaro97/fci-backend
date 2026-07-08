import { describe, it, expect } from 'vitest';
import { validate } from '../src/validators/validate.js';
import { createCashAccountSchema } from '../src/validators/cashAccount.validator.js';
import { createCategorySchema } from '../src/validators/category.validator.js';
import { createTransactionSchema } from '../src/validators/transaction.validator.js';
import { cashSummaryQuerySchema } from '../src/validators/cashSummary.validator.js';
import { CashTransactionType } from '../src/types/enums.js';
import { ValidationError } from '../src/errors/AppError.js';
import { CashSummaryService } from '../src/services/CashSummaryService.js';
import type { ICashAccountRepository } from '../src/repositories/ICashAccountRepository.js';
import type { ICategoryRepository } from '../src/repositories/ICategoryRepository.js';
import type { ITransactionRepository } from '../src/repositories/ITransactionRepository.js';
import type {
  CashAccountEntity,
  CategoryEntity,
  TransactionEntity,
} from '../src/models/index.js';

describe('Cash validators', () => {
  it('createCashAccountSchema valida cuenta con openingBalance', () => {
    const result = validate(createCashAccountSchema, {
      name: 'Caja principal',
      currency: 'ARS',
      openingBalance: 80000,
    });
    expect(result.name).toBe('Caja principal');
    expect(result.openingBalance).toBe(80000);
  });

  it('createCategorySchema valida categoría', () => {
    const result = validate(createCategorySchema, {
      name: 'Sueldo',
      type: CashTransactionType.INCOME,
    });
    expect(result.type).toBe(CashTransactionType.INCOME);
  });

  it('createTransactionSchema rechaza monto negativo', () => {
    expect(() =>
      validate(createTransactionSchema, {
        cashAccountId: 'acc1',
        categoryId: 'cat1',
        type: CashTransactionType.EXPENSE,
        amount: -10,
        date: '2026-07-01',
      }),
    ).toThrow(ValidationError);
  });

  it('cashSummaryQuerySchema valida year y month', () => {
    const result = validate(cashSummaryQuerySchema, { year: 2026, month: 7 });
    expect(result.year).toBe(2026);
    expect(result.month).toBe(7);
  });
});

describe('CashSummaryService', () => {
  it('calcula ingresos, gastos, balance y breakdown por categoría', async () => {
    const cashAccounts: CashAccountEntity[] = [
      {
        id: 'cash-1',
        userId: 'user-1',
        name: 'Caja',
        description: null,
        currency: 'ARS',
        openingBalance: 20000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const categories: CategoryEntity[] = [
      {
        id: 'parent-income',
        userId: 'user-1',
        parentId: null,
        name: 'Trabajo',
        type: CashTransactionType.INCOME,
        color: null,
        icon: null,
        createdAt: new Date(),
      },
      {
        id: 'cat-income',
        userId: 'user-1',
        parentId: 'parent-income',
        name: 'Sueldo',
        type: CashTransactionType.INCOME,
        color: null,
        icon: null,
        createdAt: new Date(),
      },
      {
        id: 'parent-expense',
        userId: 'user-1',
        parentId: null,
        name: 'Vivienda',
        type: CashTransactionType.EXPENSE,
        color: null,
        icon: null,
        createdAt: new Date(),
      },
      {
        id: 'cat-expense',
        userId: 'user-1',
        parentId: 'parent-expense',
        name: 'Alquiler',
        type: CashTransactionType.EXPENSE,
        color: null,
        icon: null,
        createdAt: new Date(),
      },
    ];

    const transactions: TransactionEntity[] = [
      {
        id: 'tx-1',
        cashAccountId: 'cash-1',
        categoryId: 'cat-income',
        type: CashTransactionType.INCOME,
        amount: 100000,
        date: new Date(2026, 6, 1),
        description: null,
        createdAt: new Date(),
      },
      {
        id: 'tx-2',
        cashAccountId: 'cash-1',
        categoryId: 'cat-expense',
        type: CashTransactionType.EXPENSE,
        amount: 40000,
        date: new Date(2026, 6, 2),
        description: null,
        createdAt: new Date(),
      },
      {
        id: 'tx-3',
        cashAccountId: 'cash-1',
        categoryId: 'cat-expense',
        type: CashTransactionType.EXPENSE,
        amount: 10000,
        date: new Date(2026, 6, 3),
        description: null,
        createdAt: new Date(),
      },
    ];

    const cashAccountRepository: ICashAccountRepository = {
      create: async () => cashAccounts[0]!,
      findById: async () => cashAccounts[0]!,
      findByUserId: async () => cashAccounts,
      findByIdAndUserId: async () => cashAccounts[0]!,
      update: async () => cashAccounts[0]!,
      delete: async () => undefined,
    };

    const categoryRepository: ICategoryRepository = {
      create: async () => categories[0]!,
      findById: async () => categories[0]!,
      findByFilters: async () => categories,
      findByIdAndUserId: async () => categories[0]!,
      update: async () => categories[0]!,
      delete: async () => undefined,
      countTransactions: async () => 0,
      countChildren: async () => 0,
    };

    const transactionRepository: ITransactionRepository = {
      create: async () => transactions[0]!,
      findById: async () => transactions[0]!,
      findByFilters: async () => transactions,
      findByIdAndCashAccountIds: async () => transactions[0]!,
      update: async () => transactions[0]!,
      delete: async () => undefined,
    };

    const service = new CashSummaryService(
      transactionRepository,
      cashAccountRepository,
      categoryRepository,
    );

    const summary = await service.getSummary('user-1', { year: 2026, month: 7 });

    expect(summary.openingBalance).toBe(20000);
    expect(summary.totalIncome).toBe(100000);
    expect(summary.totalExpense).toBe(50000);
    expect(summary.balance).toBe(70000);
    expect(summary.byCategory).toHaveLength(2);
    expect(summary.byCategory[0]!.categoryName).toBe('Sueldo');
    expect(summary.byCategory[0]!.parentCategoryName).toBe('Trabajo');
    expect(summary.byCategory[1]!.total).toBe(50000);
    expect(summary.byCategory[1]!.count).toBe(2);
    expect(summary.byParentCategory).toHaveLength(2);
    expect(summary.byParentCategory.find((c) => c.categoryName === 'Vivienda')!.total).toBe(50000);
  });
});
