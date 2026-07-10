import { NotFoundError, ValidationError } from '../errors/AppError.js';
import type { TransactionEntity } from '../models/index.js';
import type { ICashAccountRepository } from '../repositories/ICashAccountRepository.js';
import type { ICategoryRepository } from '../repositories/ICategoryRepository.js';
import type { ITransactionRepository } from '../repositories/ITransactionRepository.js';
import type { CashTransactionType } from '../types/enums.js';
import { endOfDay, parseDate, startOfDay } from '../utils/index.js';
import type {
  CreateTransactionInput,
  TransactionQueryInput,
  UpdateTransactionInput,
} from '../validators/transaction.validator.js';

export class TransactionService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly cashAccountRepository: ICashAccountRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async getAll(userId: string, query: TransactionQueryInput): Promise<TransactionEntity[]> {
    const cashAccountIds = await this.getFilteredCashAccountIds(userId, query.cashAccountId);

    if (query.categoryId) {
      const category = await this.categoryRepository.findByIdAndUserId(query.categoryId, userId);
      if (!category) {
        throw new NotFoundError('Categoría');
      }
    }

    return this.transactionRepository.findByFilters({
      cashAccountIds,
      categoryId: query.categoryId,
      type: query.type,
      startDate: query.startDate ? startOfDay(parseDate(query.startDate)) : undefined,
      endDate: query.endDate ? endOfDay(parseDate(query.endDate)) : undefined,
      excludeTransfers: query.excludeTransfers,
      excludeFundings: query.excludeFundings,
    });
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
}
