import { NotFoundError, ValidationError } from '../errors/AppError.js';
import type { AccountFundingWithDetails } from '../models/index.js';
import type { IAccountFundingRepository } from '../repositories/IAccountFundingRepository.js';
import type { IAccountRepository } from '../repositories/IAccountRepository.js';
import type { ICashAccountRepository } from '../repositories/ICashAccountRepository.js';
import type { ICategoryRepository } from '../repositories/ICategoryRepository.js';
import { CashTransactionType, FundingType, MovementType } from '../types/enums.js';
import { endOfDay, parseDate, startOfDay } from '../utils/index.js';
import type {
  CreateFundingInput,
  FundingQueryInput,
} from '../validators/funding.validator.js';

const DEPOSIT_TO_INVESTMENT_CATEGORY = 'Depósito a inversión';
const WITHDRAW_FROM_INVESTMENT_CATEGORY = 'Retiro desde inversión';

export class FundingService {
  constructor(
    private readonly fundingRepository: IAccountFundingRepository,
    private readonly cashAccountRepository: ICashAccountRepository,
    private readonly accountRepository: IAccountRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async getAll(userId: string, query: FundingQueryInput): Promise<AccountFundingWithDetails[]> {
    if (query.cashAccountId) {
      const cashAccount = await this.cashAccountRepository.findByIdAndUserId(
        query.cashAccountId,
        userId,
      );
      if (!cashAccount) {
        throw new NotFoundError('Cuenta de efectivo');
      }
    }

    if (query.investmentAccountId) {
      const investmentAccount = await this.accountRepository.findByIdAndUserId(
        query.investmentAccountId,
        userId,
      );
      if (!investmentAccount) {
        throw new NotFoundError('Cuenta de inversión');
      }
    }

    return this.fundingRepository.findByFilters({
      userId,
      cashAccountId: query.cashAccountId,
      investmentAccountId: query.investmentAccountId,
      type: query.type,
      startDate: query.startDate ? startOfDay(parseDate(query.startDate)) : undefined,
      endDate: query.endDate ? endOfDay(parseDate(query.endDate)) : undefined,
    });
  }

  async create(userId: string, input: CreateFundingInput): Promise<AccountFundingWithDetails> {
    const cashAccount = await this.cashAccountRepository.findByIdAndUserId(
      input.cashAccountId,
      userId,
    );
    if (!cashAccount) {
      throw new NotFoundError('Cuenta de efectivo');
    }

    const investmentAccount = await this.accountRepository.findByIdAndUserId(
      input.investmentAccountId,
      userId,
    );
    if (!investmentAccount) {
      throw new NotFoundError('Cuenta de inversión');
    }

    if (cashAccount.currency !== investmentAccount.currency) {
      throw new ValidationError(
        `Las cuentas deben tener la misma moneda (${cashAccount.currency} vs ${investmentAccount.currency})`,
      );
    }

    const { cashCategoryId, cashTransactionType, movementType } =
      await this.resolveFundingSides(userId, input.type);

    return this.fundingRepository.create({
      userId,
      type: input.type,
      cashAccountId: input.cashAccountId,
      investmentAccountId: input.investmentAccountId,
      amount: input.amount,
      date: parseDate(input.date),
      description: input.description,
      cashCategoryId,
      cashTransactionType,
      movementType,
    });
  }

  async delete(userId: string, fundingId: string): Promise<void> {
    const funding = await this.fundingRepository.findByIdAndUserId(fundingId, userId);
    if (!funding) {
      throw new NotFoundError('Movimiento entre efectivo e inversión');
    }
    await this.fundingRepository.delete(fundingId);
  }

  private async resolveFundingSides(
    userId: string,
    type: FundingType,
  ): Promise<{
    cashCategoryId: string;
    cashTransactionType: CashTransactionType;
    movementType: MovementType;
  }> {
    if (type === FundingType.CASH_TO_INVESTMENT) {
      const categoryId = await this.ensureCategory(
        userId,
        DEPOSIT_TO_INVESTMENT_CATEGORY,
        CashTransactionType.EXPENSE,
        'investment-deposit',
      );
      return {
        cashCategoryId: categoryId,
        cashTransactionType: CashTransactionType.EXPENSE,
        movementType: MovementType.DEPOSIT,
      };
    }

    const categoryId = await this.ensureCategory(
      userId,
      WITHDRAW_FROM_INVESTMENT_CATEGORY,
      CashTransactionType.INCOME,
      'investment-withdraw',
    );
    return {
      cashCategoryId: categoryId,
      cashTransactionType: CashTransactionType.INCOME,
      movementType: MovementType.WITHDRAW,
    };
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
