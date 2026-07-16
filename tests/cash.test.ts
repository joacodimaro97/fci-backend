import { describe, it, expect } from 'vitest';
import { validate } from '../src/validators/validate.js';
import { createCashAccountSchema } from '../src/validators/cashAccount.validator.js';
import { createCategorySchema } from '../src/validators/category.validator.js';
import { createTransactionSchema } from '../src/validators/transaction.validator.js';
import { cashSummaryQuerySchema } from '../src/validators/cashSummary.validator.js';
import { createTransferSchema } from '../src/validators/transfer.validator.js';
import { createFundingSchema } from '../src/validators/funding.validator.js';
import { createBudgetSchema } from '../src/validators/budget.validator.js';
import { FundingType } from '../src/types/enums.js';
import { CashTransactionType } from '../src/types/enums.js';
import { ValidationError } from '../src/errors/AppError.js';
import { CashSummaryService } from '../src/services/CashSummaryService.js';
import { BudgetService } from '../src/services/BudgetService.js';
import type { ICashAccountRepository } from '../src/repositories/ICashAccountRepository.js';
import type { ICategoryRepository } from '../src/repositories/ICategoryRepository.js';
import type { ITransactionRepository } from '../src/repositories/ITransactionRepository.js';
import type { IBudgetRepository } from '../src/repositories/IBudgetRepository.js';
import type {
  BudgetEntity,
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

  it('createTransferSchema valida transferencia entre cuentas cash', () => {
    const result = validate(createTransferSchema, {
      fromCashAccountId: 'acc-1',
      toCashAccountId: 'acc-2',
      amount: 1000,
      date: '2026-07-01',
    });
    expect(result.amount).toBe(1000);
  });

  it('createFundingSchema valida depósito efectivo a inversión', () => {
    const result = validate(createFundingSchema, {
      type: FundingType.CASH_TO_INVESTMENT,
      cashAccountId: 'cash-1',
      investmentAccountId: 'inv-1',
      amount: 50000,
      date: '2026-07-01',
    });
    expect(result.type).toBe(FundingType.CASH_TO_INVESTMENT);
  });

  it('createBudgetSchema valida presupuesto sin amount (usa saldo de cuenta)', () => {
    const result = validate(createBudgetSchema, {
      cashAccountId: 'cash-1',
      name: 'Gastos del mes',
      endDate: '2026-07-31',
    });
    expect(result.name).toBe('Gastos del mes');
    expect(result.amount).toBeUndefined();
  });

  it('createBudgetSchema exige amount cuando hay categorías', () => {
    expect(() =>
      validate(createBudgetSchema, {
        categoryIds: ['cat-1'],
        name: 'Comida',
        endDate: '2026-07-31',
      }),
    ).toThrow(ValidationError);
  });

  it('createBudgetSchema valida presupuesto por categorías', () => {
    const result = validate(createBudgetSchema, {
      categoryIds: ['cat-1', 'cat-2'],
      name: 'Comida y ocio',
      amount: 80000,
      endDate: '2026-07-31',
    });
    expect(result.categoryIds).toEqual(['cat-1', 'cat-2']);
    expect(result.amount).toBe(80000);
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
        transferId: null,
        fundingId: null,
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
        transferId: null,
        fundingId: null,
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
        transferId: null,
        fundingId: null,
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

  it('excluye transferencias del resumen global pero las incluye por cuenta', async () => {
    const cashAccounts: CashAccountEntity[] = [
      {
        id: 'cash-1',
        userId: 'user-1',
        name: 'Caja',
        description: null,
        currency: 'ARS',
        openingBalance: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cash-2',
        userId: 'user-1',
        name: 'Billetera',
        description: null,
        currency: 'ARS',
        openingBalance: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const categories: CategoryEntity[] = [
      {
        id: 'cat-income',
        userId: 'user-1',
        parentId: null,
        name: 'Sueldo',
        type: CashTransactionType.INCOME,
        color: null,
        icon: null,
        createdAt: new Date(),
      },
      {
        id: 'cat-transfer-out',
        userId: 'user-1',
        parentId: null,
        name: 'Transferencia saliente',
        type: CashTransactionType.EXPENSE,
        color: null,
        icon: null,
        createdAt: new Date(),
      },
      {
        id: 'cat-transfer-in',
        userId: 'user-1',
        parentId: null,
        name: 'Transferencia entrante',
        type: CashTransactionType.INCOME,
        color: null,
        icon: null,
        createdAt: new Date(),
      },
    ];

    const transactions: TransactionEntity[] = [
      {
        id: 'tx-income',
        cashAccountId: 'cash-1',
        categoryId: 'cat-income',
        type: CashTransactionType.INCOME,
        amount: 50000,
        date: new Date(2026, 6, 1),
        description: null,
        transferId: null,
        createdAt: new Date(),
      },
      {
        id: 'tx-out',
        cashAccountId: 'cash-1',
        categoryId: 'cat-transfer-out',
        type: CashTransactionType.EXPENSE,
        amount: 20000,
        date: new Date(2026, 6, 5),
        description: null,
        transferId: 'transfer-1',
        fundingId: null,
        createdAt: new Date(),
      },
      {
        id: 'tx-in',
        cashAccountId: 'cash-2',
        categoryId: 'cat-transfer-in',
        type: CashTransactionType.INCOME,
        amount: 20000,
        date: new Date(2026, 6, 5),
        description: null,
        transferId: 'transfer-1',
        fundingId: null,
        createdAt: new Date(),
      },
    ];

    const cashAccountRepository: ICashAccountRepository = {
      create: async () => cashAccounts[0]!,
      findById: async () => cashAccounts[0]!,
      findByUserId: async () => cashAccounts,
      findByIdAndUserId: async (id) => cashAccounts.find((a) => a.id === id) ?? null,
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
      findByFilters: async ({ cashAccountIds }) =>
        transactions.filter((tx) => !cashAccountIds || cashAccountIds.includes(tx.cashAccountId)),
      findByIdAndCashAccountIds: async () => transactions[0]!,
      update: async () => transactions[0]!,
      delete: async () => undefined,
    };

    const service = new CashSummaryService(
      transactionRepository,
      cashAccountRepository,
      categoryRepository,
    );

    const globalSummary = await service.getSummary('user-1', { year: 2026, month: 7 });
    expect(globalSummary.totalIncome).toBe(50000);
    expect(globalSummary.totalExpense).toBe(0);
    expect(globalSummary.balance).toBe(65000);

    const accountSummary = await service.getSummary('user-1', {
      year: 2026,
      month: 7,
      cashAccountId: 'cash-1',
    });
    expect(accountSummary.totalIncome).toBe(50000);
    expect(accountSummary.totalExpense).toBe(20000);
    expect(accountSummary.balance).toBe(40000);
  });

  it('excluye fundings del resumen global pero los incluye por cuenta cash', async () => {
    const cashAccounts: CashAccountEntity[] = [
      {
        id: 'cash-1',
        userId: 'user-1',
        name: 'Caja',
        description: null,
        currency: 'ARS',
        openingBalance: 200000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const categories: CategoryEntity[] = [
      {
        id: 'cat-funding',
        userId: 'user-1',
        parentId: null,
        name: 'Depósito a inversión',
        type: CashTransactionType.EXPENSE,
        color: null,
        icon: null,
        createdAt: new Date(),
      },
    ];

    const transactions: TransactionEntity[] = [
      {
        id: 'tx-funding',
        cashAccountId: 'cash-1',
        categoryId: 'cat-funding',
        type: CashTransactionType.EXPENSE,
        amount: 100000,
        date: new Date(2026, 6, 2),
        description: null,
        transferId: null,
        fundingId: 'funding-1',
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

    const globalSummary = await service.getSummary('user-1', { year: 2026, month: 7 });
    expect(globalSummary.totalExpense).toBe(0);
    expect(globalSummary.balance).toBe(200000);

    const accountSummary = await service.getSummary('user-1', {
      year: 2026,
      month: 7,
      cashAccountId: 'cash-1',
    });
    expect(accountSummary.totalExpense).toBe(100000);
    expect(accountSummary.balance).toBe(100000);
  });
});

describe('BudgetService', () => {
  const cashAccount: CashAccountEntity = {
    id: 'cash-1',
    userId: 'user-1',
    name: 'MercadoPago',
    description: null,
    currency: 'ARS',
    openingBalance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const categories: CategoryEntity[] = [
    {
      id: 'parent-food',
      userId: 'user-1',
      parentId: null,
      name: 'Alimentación',
      type: CashTransactionType.EXPENSE,
      color: '#f97316',
      icon: 'food',
      createdAt: new Date(),
    },
    {
      id: 'cat-food',
      userId: 'user-1',
      parentId: 'parent-food',
      name: 'Supermercado',
      type: CashTransactionType.EXPENSE,
      color: null,
      icon: null,
      createdAt: new Date(),
    },
    {
      id: 'cat-other',
      userId: 'user-1',
      parentId: null,
      name: 'Ocio',
      type: CashTransactionType.EXPENSE,
      color: null,
      icon: null,
      createdAt: new Date(),
    },
  ];

  function buildService(budget: BudgetEntity, expenses: TransactionEntity[]) {
    const budgetRepository: IBudgetRepository = {
      create: async () => budget,
      findByUserId: async () => [budget],
      findByIdAndUserId: async () => budget,
      update: async () => budget,
      delete: async () => undefined,
    };

    const cashAccountRepository: ICashAccountRepository = {
      create: async () => cashAccount,
      findById: async () => cashAccount,
      findByUserId: async () => [cashAccount],
      findByIdAndUserId: async () => cashAccount,
      update: async () => cashAccount,
      delete: async () => undefined,
    };

    const transactionRepository: ITransactionRepository = {
      create: async () => expenses[0]!,
      findById: async () => expenses[0]!,
      findByFilters: async (filters) => {
        let result = expenses;
        if (filters.type === CashTransactionType.EXPENSE) {
          result = result.filter((tx) => tx.type === CashTransactionType.EXPENSE);
        }
        if (filters.categoryIds?.length) {
          result = result.filter((tx) => filters.categoryIds!.includes(tx.categoryId));
        }
        if (filters.cashAccountId) {
          result = result.filter((tx) => tx.cashAccountId === filters.cashAccountId);
        }
        return result;
      },
      findByIdAndCashAccountIds: async () => expenses[0]!,
      update: async () => expenses[0]!,
      delete: async () => undefined,
    };

    const categoryRepository: ICategoryRepository = {
      create: async () => categories[0]!,
      findById: async () => categories[0]!,
      findByFilters: async () => categories,
      findByIdAndUserId: async (id) => categories.find((c) => c.id === id) ?? null,
      update: async () => categories[0]!,
      delete: async () => undefined,
      countTransactions: async () => 0,
      countChildren: async () => 0,
    };

    return new BudgetService(
      budgetRepository,
      cashAccountRepository,
      transactionRepository,
      categoryRepository,
    );
  }

  it('calcula gasto diario y análisis de un presupuesto finalizado', async () => {
    const budget: BudgetEntity = {
      id: 'budget-1',
      userId: 'user-1',
      cashAccountId: 'cash-1',
      name: 'Gastos enero',
      amount: 300000,
      startDate: new Date(2020, 0, 1),
      endDate: new Date(2020, 0, 10),
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryIds: [],
    };

    const expenses: TransactionEntity[] = [
      {
        id: 'e1',
        cashAccountId: 'cash-1',
        categoryId: 'cat-food',
        type: CashTransactionType.EXPENSE,
        amount: 150000,
        date: new Date(2020, 0, 3),
        description: null,
        transferId: null,
        fundingId: null,
        createdAt: new Date(),
      },
      {
        id: 'e2',
        cashAccountId: 'cash-1',
        categoryId: 'cat-other',
        type: CashTransactionType.EXPENSE,
        amount: 100000,
        date: new Date(2020, 0, 6),
        description: null,
        transferId: null,
        fundingId: null,
        createdAt: new Date(),
      },
    ];

    const service = buildService(budget, expenses);
    const result = await service.getById('user-1', 'budget-1');

    expect(result.analysis.totalDays).toBe(10);
    expect(result.analysis.dailyAllowance).toBe(30000);
    expect(result.analysis.spent).toBe(250000);
    expect(result.analysis.remaining).toBe(50000);
    expect(result.analysis.status).toBe('COMPLETED');
    expect(result.analysis.percentUsed).toBeCloseTo(83.33, 1);
    expect(result.cashAccount?.name).toBe('MercadoPago');
  });

  it('marca overspent cuando el gasto supera el monto del presupuesto', async () => {
    const budget: BudgetEntity = {
      id: 'budget-2',
      userId: 'user-1',
      cashAccountId: 'cash-1',
      name: 'Gastos enero',
      amount: 100000,
      startDate: new Date(2020, 0, 1),
      endDate: new Date(2020, 0, 10),
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryIds: [],
    };

    const expenses: TransactionEntity[] = [
      {
        id: 'e1',
        cashAccountId: 'cash-1',
        categoryId: 'cat-food',
        type: CashTransactionType.EXPENSE,
        amount: 130000,
        date: new Date(2020, 0, 5),
        description: null,
        transferId: null,
        fundingId: null,
        createdAt: new Date(),
      },
    ];

    const service = buildService(budget, expenses);
    const result = await service.getById('user-1', 'budget-2');

    expect(result.analysis.overspent).toBe(true);
    expect(result.analysis.remaining).toBe(-30000);
    expect(result.analysis.status).toBe('COMPLETED');
  });

  it('presupuesto por categoría solo cuenta gastos de esas categorías (incluye hijos)', async () => {
    const budget: BudgetEntity = {
      id: 'budget-cat',
      userId: 'user-1',
      cashAccountId: null,
      name: 'Presupuesto comida',
      amount: 100000,
      startDate: new Date(2020, 0, 1),
      endDate: new Date(2020, 0, 10),
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryIds: ['parent-food'],
    };

    const expenses: TransactionEntity[] = [
      {
        id: 'e1',
        cashAccountId: 'cash-1',
        categoryId: 'cat-food',
        type: CashTransactionType.EXPENSE,
        amount: 40000,
        date: new Date(2020, 0, 3),
        description: null,
        transferId: null,
        fundingId: null,
        createdAt: new Date(),
      },
      {
        id: 'e2',
        cashAccountId: 'cash-1',
        categoryId: 'cat-other',
        type: CashTransactionType.EXPENSE,
        amount: 90000,
        date: new Date(2020, 0, 4),
        description: null,
        transferId: null,
        fundingId: null,
        createdAt: new Date(),
      },
    ];

    const service = buildService(budget, expenses);
    const result = await service.getById('user-1', 'budget-cat');

    expect(result.analysis.spent).toBe(40000);
    expect(result.analysis.remaining).toBe(60000);
    expect(result.analysis.dailyAllowance).toBe(10000);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]!.name).toBe('Alimentación');
    expect(result.cashAccount).toBeNull();
  });
});
