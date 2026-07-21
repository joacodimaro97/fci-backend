import { NotFoundError, ValidationError } from '../errors/AppError.js';
import type {
  CalendarInstallmentItem,
  CreditSummary,
  CreditWithDetails,
} from '../models/index.js';
import type { ICashAccountRepository } from '../repositories/ICashAccountRepository.js';
import type { ICategoryRepository } from '../repositories/ICategoryRepository.js';
import type { ICreditRepository } from '../repositories/ICreditRepository.js';
import {
  CashTransactionType,
  CreditDirection,
  CreditStatus,
  InstallmentStatus,
} from '../types/enums.js';
import {
  addMonths,
  endOfDay,
  parseDate,
  splitEqualAmounts,
  startOfDay,
  todayCalendarDate,
} from '../utils/index.js';
import type {
  CalendarQueryInput,
  CreateCreditInput,
  CreditQueryInput,
  PayInstallmentInput,
  SummaryQueryInput,
  UpdateCreditInput,
  UpdateInstallmentInput,
} from '../validators/credit.validator.js';

const PAY_CREDIT_CATEGORY = 'Pago de crédito';
const COLLECT_CREDIT_CATEGORY = 'Cobro de crédito';

export class CreditService {
  constructor(
    private readonly creditRepository: ICreditRepository,
    private readonly cashAccountRepository: ICashAccountRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async getAll(userId: string, query: CreditQueryInput): Promise<CreditWithDetails[]> {
    return this.creditRepository.findByFilters({
      userId,
      direction: query.direction,
      status: query.status,
      currency: query.currency,
    });
  }

  async getById(userId: string, creditId: string): Promise<CreditWithDetails> {
    const credit = await this.creditRepository.findByIdAndUserId(creditId, userId);
    if (!credit) {
      throw new NotFoundError('Crédito');
    }
    return credit;
  }

  async create(userId: string, input: CreateCreditInput): Promise<CreditWithDetails> {
    const currency = input.currency ?? 'ARS';

    if (input.defaultCashAccountId) {
      await this.verifyCashAccount(userId, input.defaultCashAccountId, currency);
    }

    const amounts = splitEqualAmounts(input.principal, input.installmentCount);
    const startDate = parseDate(input.startDate);
    const dueDates = input.dueDates
      ? input.dueDates.map((d) => parseDate(d))
      : Array.from({ length: input.installmentCount }, (_, i) => addMonths(startDate, i));

    return this.creditRepository.create({
      userId,
      name: input.name,
      description: input.description,
      counterparty: input.counterparty,
      direction: input.direction,
      currency,
      principal: input.principal,
      installmentCount: input.installmentCount,
      installmentAmount: amounts[0]!,
      startDate,
      defaultCashAccountId: input.defaultCashAccountId,
      installments: amounts.map((amount, index) => ({
        number: index + 1,
        dueDate: dueDates[index]!,
        amount,
      })),
    });
  }

  async update(
    userId: string,
    creditId: string,
    input: UpdateCreditInput,
  ): Promise<CreditWithDetails> {
    const credit = await this.getById(userId, creditId);

    if (input.defaultCashAccountId) {
      await this.verifyCashAccount(userId, input.defaultCashAccountId, credit.currency);
    }

    return this.creditRepository.update(creditId, {
      name: input.name,
      description: input.description,
      counterparty: input.counterparty,
      defaultCashAccountId: input.defaultCashAccountId,
    });
  }

  async delete(userId: string, creditId: string): Promise<void> {
    const credit = await this.getById(userId, creditId);
    const hasPaid = credit.installments.some((i) => i.status === InstallmentStatus.PAID);

    if (hasPaid) {
      await this.creditRepository.update(creditId, { status: CreditStatus.CANCELLED });
      return;
    }

    await this.creditRepository.delete(creditId);
  }

  async updateInstallmentDueDate(
    userId: string,
    creditId: string,
    installmentId: string,
    input: UpdateInstallmentInput,
  ): Promise<CreditWithDetails> {
    const credit = await this.getById(userId, creditId);
    const installment = credit.installments.find((i) => i.id === installmentId);
    if (!installment) {
      throw new NotFoundError('Cuota');
    }
    if (installment.status === InstallmentStatus.PAID) {
      throw new ValidationError('No se puede reprogramar una cuota ya pagada');
    }

    await this.creditRepository.updateInstallmentDueDate(
      installmentId,
      parseDate(input.dueDate),
    );
    return this.getById(userId, creditId);
  }

  async payInstallment(
    userId: string,
    creditId: string,
    installmentId: string,
    input: PayInstallmentInput,
  ): Promise<CreditWithDetails> {
    const credit = await this.getById(userId, creditId);
    if (credit.status === CreditStatus.CANCELLED) {
      throw new ValidationError('No se puede pagar una cuota de un crédito cancelado');
    }

    const installment = credit.installments.find((i) => i.id === installmentId);
    if (!installment) {
      throw new NotFoundError('Cuota');
    }
    if (installment.status === InstallmentStatus.PAID) {
      throw new ValidationError('La cuota ya está pagada');
    }

    const cashAccount = await this.verifyCashAccount(
      userId,
      input.cashAccountId,
      credit.currency,
    );

    const { categoryId, cashTransactionType } = await this.resolvePaymentSides(
      userId,
      credit.direction,
    );

    return this.creditRepository.payInstallment({
      installmentId,
      cashAccountId: cashAccount.id,
      categoryId,
      cashTransactionType,
      date: input.date ? parseDate(input.date) : todayCalendarDate(),
      description: input.description,
    });
  }

  async unpayInstallment(
    userId: string,
    creditId: string,
    installmentId: string,
  ): Promise<CreditWithDetails> {
    const credit = await this.getById(userId, creditId);
    const installment = credit.installments.find((i) => i.id === installmentId);
    if (!installment) {
      throw new NotFoundError('Cuota');
    }
    if (installment.status !== InstallmentStatus.PAID) {
      throw new ValidationError('La cuota no está pagada');
    }

    return this.creditRepository.unpayInstallment(installmentId);
  }

  async getCalendar(
    userId: string,
    query: CalendarQueryInput,
  ): Promise<CalendarInstallmentItem[]> {
    return this.creditRepository.findCalendar({
      userId,
      direction: query.direction,
      status: query.status,
      startDate: query.startDate ? startOfDay(parseDate(query.startDate)) : undefined,
      endDate: query.endDate ? endOfDay(parseDate(query.endDate)) : undefined,
    });
  }

  async getSummary(userId: string, query: SummaryQueryInput): Promise<CreditSummary> {
    const credits = await this.creditRepository.findByFilters({
      userId,
      status: CreditStatus.ACTIVE,
    });

    const owedByMe = { totalPending: 0, totalOverdue: 0, activeCredits: 0 };
    const owedToMe = { totalPending: 0, totalOverdue: 0, activeCredits: 0 };

    for (const credit of credits) {
      const bucket = credit.direction === CreditDirection.OWED_BY_ME ? owedByMe : owedToMe;
      bucket.activeCredits += 1;
      bucket.totalPending += credit.totals.pendingAmount;
      bucket.totalOverdue += credit.totals.overdueAmount;
    }

    const today = startOfDay(todayCalendarDate());
    const upcoming = await this.creditRepository.findCalendar({
      userId,
      status: InstallmentStatus.PENDING,
      startDate: today,
    });

    return {
      owedByMe,
      owedToMe,
      upcoming: upcoming.slice(0, query.upcomingLimit),
    };
  }

  private async verifyCashAccount(userId: string, cashAccountId: string, currency: string) {
    const cashAccount = await this.cashAccountRepository.findByIdAndUserId(
      cashAccountId,
      userId,
    );
    if (!cashAccount) {
      throw new NotFoundError('Cuenta de efectivo');
    }
    if (cashAccount.currency !== currency) {
      throw new ValidationError(
        `La cuenta debe tener la misma moneda del crédito (${currency} vs ${cashAccount.currency})`,
      );
    }
    return cashAccount;
  }

  private async resolvePaymentSides(
    userId: string,
    direction: CreditDirection,
  ): Promise<{ categoryId: string; cashTransactionType: CashTransactionType }> {
    if (direction === CreditDirection.OWED_BY_ME) {
      const categoryId = await this.ensureCategory(
        userId,
        PAY_CREDIT_CATEGORY,
        CashTransactionType.EXPENSE,
        'credit-payment',
      );
      return { categoryId, cashTransactionType: CashTransactionType.EXPENSE };
    }

    const categoryId = await this.ensureCategory(
      userId,
      COLLECT_CREDIT_CATEGORY,
      CashTransactionType.INCOME,
      'credit-collection',
    );
    return { categoryId, cashTransactionType: CashTransactionType.INCOME };
  }

  private async ensureCategory(
    userId: string,
    name: string,
    type: CashTransactionType,
    icon: string,
  ): Promise<string> {
    const categories = await this.categoryRepository.findByFilters({ userId });
    const existing = categories.find((c) => c.name === name && c.type === type);
    if (existing) {
      return existing.id;
    }

    const created = await this.categoryRepository.create({
      userId,
      name,
      type,
      color: '#475569',
      icon,
    });
    return created.id;
  }
}
