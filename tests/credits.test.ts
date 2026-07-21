import { describe, it, expect } from 'vitest';
import { validate } from '../src/validators/validate.js';
import {
  calendarQuerySchema,
  createCreditSchema,
  payInstallmentSchema,
  updateInstallmentSchema,
} from '../src/validators/credit.validator.js';
import { CreditDirection, CreditStatus, InstallmentStatus } from '../src/types/enums.js';
import { ValidationError } from '../src/errors/AppError.js';
import { CreditService } from '../src/services/CreditService.js';
import { addMonths, parseDate, splitEqualAmounts } from '../src/utils/index.js';
import type { ICashAccountRepository } from '../src/repositories/ICashAccountRepository.js';
import type { ICategoryRepository } from '../src/repositories/ICategoryRepository.js';
import type { ICreditRepository } from '../src/repositories/ICreditRepository.js';
import type {
  CalendarInstallmentItem,
  CashAccountEntity,
  CategoryEntity,
  CreditWithDetails,
  CreateCreditData,
  PayInstallmentData,
  UpdateCreditData,
} from '../src/models/index.js';
import { CashTransactionType } from '../src/types/enums.js';

describe('Credit utils', () => {
  it('splitEqualAmounts reparte residuo en la última cuota', () => {
    expect(splitEqualAmounts(1000, 3)).toEqual([333.33, 333.33, 333.34]);
    expect(splitEqualAmounts(100, 2)).toEqual([50, 50]);
  });

  it('addMonths clampa día al último del mes', () => {
    const jan31 = parseDate('2026-01-31');
    const feb = addMonths(jan31, 1);
    expect(feb.getUTCDate()).toBe(28);
    expect(feb.getUTCMonth()).toBe(1);
  });
});

describe('Credit validators', () => {
  it('createCreditSchema valida crédito simple', () => {
    const result = validate(createCreditSchema, {
      name: 'Notebook 12 cuotas',
      direction: CreditDirection.OWED_BY_ME,
      principal: 120000,
      installmentCount: 12,
      startDate: '2026-07-01',
    });
    expect(result.name).toBe('Notebook 12 cuotas');
    expect(result.direction).toBe(CreditDirection.OWED_BY_ME);
  });

  it('createCreditSchema exige dueDates con length = installmentCount', () => {
    expect(() =>
      validate(createCreditSchema, {
        name: 'Préstamo',
        direction: CreditDirection.OWED_TO_ME,
        principal: 10000,
        installmentCount: 3,
        startDate: '2026-07-01',
        dueDates: ['2026-07-01', '2026-08-01'],
      }),
    ).toThrow(ValidationError);
  });

  it('updateInstallmentSchema y payInstallmentSchema validan fechas', () => {
    expect(validate(updateInstallmentSchema, { dueDate: '2026-08-15' }).dueDate).toBe(
      '2026-08-15',
    );
    expect(
      validate(payInstallmentSchema, { cashAccountId: 'cash-1', date: '2026-07-20' })
        .cashAccountId,
    ).toBe('cash-1');
  });

  it('calendarQuerySchema acepta filtros de fecha y direction', () => {
    const result = validate(calendarQuerySchema, {
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      direction: CreditDirection.OWED_BY_ME,
      status: InstallmentStatus.PENDING,
    });
    expect(result.direction).toBe(CreditDirection.OWED_BY_ME);
  });
});

describe('CreditService', () => {
  const cashAccount: CashAccountEntity = {
    id: 'cash-1',
    userId: 'user-1',
    name: 'Caja',
    description: null,
    currency: 'ARS',
    openingBalance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function buildCredit(overrides: Partial<CreditWithDetails> = {}): CreditWithDetails {
    const due1 = parseDate('2026-07-01');
    const due2 = parseDate('2026-08-01');
    const due3 = parseDate('2026-09-01');
    const installments = [
      {
        id: 'inst-1',
        creditId: 'credit-1',
        number: 1,
        dueDate: due1,
        amount: 1000,
        status: InstallmentStatus.PENDING,
        paidAt: null,
        cashAccountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        overdue: false,
        transactionId: null,
      },
      {
        id: 'inst-2',
        creditId: 'credit-1',
        number: 2,
        dueDate: due2,
        amount: 1000,
        status: InstallmentStatus.PENDING,
        paidAt: null,
        cashAccountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        overdue: false,
        transactionId: null,
      },
      {
        id: 'inst-3',
        creditId: 'credit-1',
        number: 3,
        dueDate: due3,
        amount: 1000,
        status: InstallmentStatus.PENDING,
        paidAt: null,
        cashAccountId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        overdue: false,
        transactionId: null,
      },
    ];

    return {
      id: 'credit-1',
      userId: 'user-1',
      name: 'Compra en cuotas',
      description: null,
      counterparty: 'Tienda',
      direction: CreditDirection.OWED_BY_ME,
      currency: 'ARS',
      principal: 3000,
      installmentCount: 3,
      installmentAmount: 1000,
      startDate: due1,
      status: CreditStatus.ACTIVE,
      defaultCashAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      defaultCashAccount: null,
      installments,
      totals: {
        paidAmount: 0,
        pendingAmount: 3000,
        paidCount: 0,
        pendingCount: 3,
        nextDueDate: due1,
        overdueAmount: 0,
        overdueCount: 0,
      },
      ...overrides,
    };
  }

  it('create genera N cuotas mensuales desde startDate', async () => {
    let created: CreateCreditData | null = null;
    const creditRepository: ICreditRepository = {
      create: async (data) => {
        created = data;
        return buildCredit({
          installmentCount: data.installmentCount,
          principal: data.principal,
          installments: data.installments.map((item, idx) => ({
            id: `inst-${idx + 1}`,
            creditId: 'credit-1',
            number: item.number,
            dueDate: item.dueDate,
            amount: item.amount,
            status: InstallmentStatus.PENDING,
            paidAt: null,
            cashAccountId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            overdue: false,
            transactionId: null,
          })),
        });
      },
      findByFilters: async () => [],
      findByIdAndUserId: async () => null,
      update: async () => buildCredit(),
      delete: async () => undefined,
      updateInstallmentDueDate: async () => buildCredit().installments[0]!,
      payInstallment: async () => buildCredit(),
      unpayInstallment: async () => buildCredit(),
      findCalendar: async () => [],
      findCreditEntityByIdAndUserId: async () => null,
    };

    const cashAccountRepository: ICashAccountRepository = {
      create: async () => cashAccount,
      findById: async () => cashAccount,
      findByUserId: async () => [cashAccount],
      findByIdAndUserId: async () => cashAccount,
      update: async () => cashAccount,
      delete: async () => undefined,
    };

    const categoryRepository: ICategoryRepository = {
      create: async (data) =>
        ({
          id: 'cat-1',
          userId: data.userId,
          parentId: null,
          name: data.name,
          type: data.type,
          color: data.color ?? null,
          icon: data.icon ?? null,
          createdAt: new Date(),
        }) satisfies CategoryEntity,
      findById: async () => null,
      findByFilters: async () => [],
      findByIdAndUserId: async () => null,
      update: async () => null as never,
      delete: async () => undefined,
      countTransactions: async () => 0,
      countChildren: async () => 0,
    };

    const service = new CreditService(
      creditRepository,
      cashAccountRepository,
      categoryRepository,
    );

    await service.create('user-1', {
      name: 'Notebook',
      direction: CreditDirection.OWED_BY_ME,
      principal: 3000,
      installmentCount: 3,
      startDate: '2026-07-01',
    });

    expect(created).not.toBeNull();
    expect(created!.installments).toHaveLength(3);
    expect(created!.installments[0]!.dueDate).toEqual(parseDate('2026-07-01'));
    expect(created!.installments[1]!.dueDate).toEqual(parseDate('2026-08-01'));
    expect(created!.installments[2]!.dueDate).toEqual(parseDate('2026-09-01'));
    expect(created!.installments.reduce((s, i) => s + i.amount, 0)).toBe(3000);
  });

  it('payInstallment OWED_BY_ME crea EXPENSE y unpay revierte', async () => {
    let paidPayload: PayInstallmentData | null = null;
    let unpaidId: string | null = null;
    let credit = buildCredit();

    const creditRepository: ICreditRepository = {
      create: async () => credit,
      findByFilters: async () => [credit],
      findByIdAndUserId: async () => credit,
      update: async (_id, data: UpdateCreditData) => {
        credit = buildCredit({ status: data.status ?? credit.status });
        return credit;
      },
      delete: async () => undefined,
      updateInstallmentDueDate: async () => credit.installments[0]!,
      payInstallment: async (data) => {
        paidPayload = data;
        credit = buildCredit({
          installments: credit.installments.map((i) =>
            i.id === data.installmentId
              ? {
                  ...i,
                  status: InstallmentStatus.PAID,
                  paidAt: data.date,
                  cashAccountId: data.cashAccountId,
                  transactionId: 'tx-1',
                }
              : i,
          ),
        });
        return credit;
      },
      unpayInstallment: async (installmentId) => {
        unpaidId = installmentId;
        credit = buildCredit();
        return credit;
      },
      findCalendar: async () => [],
      findCreditEntityByIdAndUserId: async () => credit,
    };

    const cashAccountRepository: ICashAccountRepository = {
      create: async () => cashAccount,
      findById: async () => cashAccount,
      findByUserId: async () => [cashAccount],
      findByIdAndUserId: async () => cashAccount,
      update: async () => cashAccount,
      delete: async () => undefined,
    };

    const categories: CategoryEntity[] = [];
    const categoryRepository: ICategoryRepository = {
      create: async (data) => {
        const cat: CategoryEntity = {
          id: `cat-${categories.length + 1}`,
          userId: data.userId,
          parentId: null,
          name: data.name,
          type: data.type,
          color: data.color ?? null,
          icon: data.icon ?? null,
          createdAt: new Date(),
        };
        categories.push(cat);
        return cat;
      },
      findById: async () => null,
      findByFilters: async () => categories,
      findByIdAndUserId: async () => null,
      update: async () => null as never,
      delete: async () => undefined,
      countTransactions: async () => 0,
      countChildren: async () => 0,
    };

    const service = new CreditService(
      creditRepository,
      cashAccountRepository,
      categoryRepository,
    );

    await service.payInstallment('user-1', 'credit-1', 'inst-1', {
      cashAccountId: 'cash-1',
      date: '2026-07-05',
    });

    expect(paidPayload).not.toBeNull();
    expect(paidPayload!.cashTransactionType).toBe(CashTransactionType.EXPENSE);
    expect(paidPayload!.date).toEqual(parseDate('2026-07-05'));

    await service.unpayInstallment('user-1', 'credit-1', 'inst-1');
    expect(unpaidId).toBe('inst-1');
  });

  it('payInstallment OWED_TO_ME crea INCOME', async () => {
    let paidPayload: PayInstallmentData | null = null;
    const credit = buildCredit({ direction: CreditDirection.OWED_TO_ME });

    const creditRepository: ICreditRepository = {
      create: async () => credit,
      findByFilters: async () => [credit],
      findByIdAndUserId: async () => credit,
      update: async () => credit,
      delete: async () => undefined,
      updateInstallmentDueDate: async () => credit.installments[0]!,
      payInstallment: async (data) => {
        paidPayload = data;
        return credit;
      },
      unpayInstallment: async () => credit,
      findCalendar: async () => [],
      findCreditEntityByIdAndUserId: async () => credit,
    };

    const cashAccountRepository: ICashAccountRepository = {
      create: async () => cashAccount,
      findById: async () => cashAccount,
      findByUserId: async () => [cashAccount],
      findByIdAndUserId: async () => cashAccount,
      update: async () => cashAccount,
      delete: async () => undefined,
    };

    const categoryRepository: ICategoryRepository = {
      create: async (data) =>
        ({
          id: 'cat-collect',
          userId: data.userId,
          parentId: null,
          name: data.name,
          type: data.type,
          color: null,
          icon: null,
          createdAt: new Date(),
        }) satisfies CategoryEntity,
      findById: async () => null,
      findByFilters: async () => [],
      findByIdAndUserId: async () => null,
      update: async () => null as never,
      delete: async () => undefined,
      countTransactions: async () => 0,
      countChildren: async () => 0,
    };

    const service = new CreditService(
      creditRepository,
      cashAccountRepository,
      categoryRepository,
    );

    await service.payInstallment('user-1', 'credit-1', 'inst-1', {
      cashAccountId: 'cash-1',
    });

    expect(paidPayload!.cashTransactionType).toBe(CashTransactionType.INCOME);
  });

  it('getSummary agrega pendientes por dirección y próximos vencimientos', async () => {
    const owedByMe = buildCredit({
      id: 'c1',
      direction: CreditDirection.OWED_BY_ME,
      totals: {
        paidAmount: 0,
        pendingAmount: 2000,
        paidCount: 0,
        pendingCount: 2,
        nextDueDate: parseDate('2026-08-01'),
        overdueAmount: 500,
        overdueCount: 1,
      },
    });
    const owedToMe = buildCredit({
      id: 'c2',
      direction: CreditDirection.OWED_TO_ME,
      totals: {
        paidAmount: 0,
        pendingAmount: 1500,
        paidCount: 0,
        pendingCount: 1,
        nextDueDate: parseDate('2026-08-10'),
        overdueAmount: 0,
        overdueCount: 0,
      },
    });

    const upcoming: CalendarInstallmentItem[] = [
      {
        installmentId: 'inst-2',
        creditId: 'c1',
        creditName: 'Compra',
        counterparty: null,
        direction: CreditDirection.OWED_BY_ME,
        currency: 'ARS',
        number: 2,
        dueDate: parseDate('2026-08-01'),
        amount: 1000,
        status: InstallmentStatus.PENDING,
        paidAt: null,
        overdue: false,
      },
    ];

    const creditRepository: ICreditRepository = {
      create: async () => owedByMe,
      findByFilters: async () => [owedByMe, owedToMe],
      findByIdAndUserId: async () => owedByMe,
      update: async () => owedByMe,
      delete: async () => undefined,
      updateInstallmentDueDate: async () => owedByMe.installments[0]!,
      payInstallment: async () => owedByMe,
      unpayInstallment: async () => owedByMe,
      findCalendar: async () => upcoming,
      findCreditEntityByIdAndUserId: async () => owedByMe,
    };

    const cashAccountRepository: ICashAccountRepository = {
      create: async () => cashAccount,
      findById: async () => cashAccount,
      findByUserId: async () => [cashAccount],
      findByIdAndUserId: async () => cashAccount,
      update: async () => cashAccount,
      delete: async () => undefined,
    };

    const categoryRepository: ICategoryRepository = {
      create: async () => null as never,
      findById: async () => null,
      findByFilters: async () => [],
      findByIdAndUserId: async () => null,
      update: async () => null as never,
      delete: async () => undefined,
      countTransactions: async () => 0,
      countChildren: async () => 0,
    };

    const service = new CreditService(
      creditRepository,
      cashAccountRepository,
      categoryRepository,
    );

    const summary = await service.getSummary('user-1', { upcomingLimit: 10 });
    expect(summary.owedByMe.totalPending).toBe(2000);
    expect(summary.owedByMe.totalOverdue).toBe(500);
    expect(summary.owedToMe.totalPending).toBe(1500);
    expect(summary.upcoming).toHaveLength(1);
  });
});
