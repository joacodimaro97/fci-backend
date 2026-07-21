import { NotFoundError, ValidationError } from '../errors/AppError.js';
import type { TransactionEntity } from '../models/index.js';
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

const REIMBURSEMENT_CATEGORY = 'Reintegros';

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
      excludeTransfers: query.excludeTransfers === 'true',
      excludeFundings: query.excludeFundings === 'true',
    });
  }

  async create(userId: string, input: CreateTransactionInput): Promise<TransactionEntity> {
    await this.verifyCashAccountOwnership(userId, input.cashAccountId);
    await this.validateRelatedExpense(userId, input.type, input.relatedExpenseId, input.amount);
    const categoryId = await this.resolveCategoryIdForTransaction(
      userId,
      input.type,
      input.categoryId,
      input.relatedExpenseId,
    );
    await this.ensureCategoryMatchesType(userId, categoryId, input.type);

    return this.transactionRepository.create({
      cashAccountId: input.cashAccountId,
      categoryId,
      type: input.type,
      amount: input.amount,
      date: parseDate(input.date),
      description: input.description,
      relatedExpenseId: input.relatedExpenseId,
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
    const nextType = input.type ?? transaction.type;
    const nextAmount = input.amount ?? transaction.amount;
    const nextRelatedExpenseId =
      input.relatedExpenseId !== undefined ? input.relatedExpenseId : transaction.relatedExpenseId;
    const nextCategoryId = await this.resolveCategoryIdForTransaction(
      userId,
      nextType,
      input.categoryId ?? transaction.categoryId,
      nextRelatedExpenseId,
    );

    if (input.cashAccountId) {
      await this.verifyCashAccountOwnership(userId, input.cashAccountId);
    }

    await this.ensureCategoryMatchesType(userId, nextCategoryId, nextType);
    await this.validateRelatedExpense(
      userId,
      nextType,
      nextRelatedExpenseId,
      nextAmount,
      transaction.id,
    );
    await this.ensureExpenseCanCoverReimbursements(transaction.id, nextType, nextAmount);

    return this.transactionRepository.update(transactionId, {
      cashAccountId: nextCashAccountId,
      categoryId: nextCategoryId,
      type: nextType,
      amount: input.amount,
      date: input.date ? parseDate(input.date) : undefined,
      description: input.description,
      relatedExpenseId: nextRelatedExpenseId,
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

    await this.ensureExpenseCanBeDeleted(transaction);

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

  private async validateRelatedExpense(
    userId: string,
    type: CashTransactionType,
    relatedExpenseId: string | null | undefined,
    amount: number,
    currentTransactionId?: string,
  ): Promise<void> {
    if (!relatedExpenseId) {
      return;
    }

    if (type !== CashTransactionType.INCOME) {
      throw new ValidationError('Solo los ingresos pueden vincularse a un gasto para reintegro');
    }

    if (currentTransactionId && relatedExpenseId === currentTransactionId) {
      throw new ValidationError('Una transacción no puede vincularse a sí misma');
    }

    const cashAccountIds = await this.getUserCashAccountIds(userId);
    const expenseTx = await this.transactionRepository.findByIdAndCashAccountIds(
      relatedExpenseId,
      cashAccountIds,
    );
    if (!expenseTx) {
      throw new NotFoundError('Gasto relacionado');
    }

    if (expenseTx.type !== CashTransactionType.EXPENSE) {
      throw new ValidationError('El movimiento relacionado debe ser un gasto');
    }

    if (expenseTx.transferId || expenseTx.fundingId) {
      throw new ValidationError('No se puede vincular un reintegro a una transacción del sistema');
    }

    const reimbursements = await this.transactionRepository.findByFilters({
      relatedExpenseId,
      type: CashTransactionType.INCOME,
    });
    const totalAlreadyReimbursed = reimbursements
      .filter((tx) => tx.id !== currentTransactionId)
      .reduce((sum, tx) => sum + tx.amount, 0);

    if (totalAlreadyReimbursed + amount > expenseTx.amount) {
      throw new ValidationError(
        `El reintegro supera el gasto original. Disponible: ${(expenseTx.amount - totalAlreadyReimbursed).toFixed(2)}`,
      );
    }
  }

  private async ensureExpenseCanCoverReimbursements(
    transactionId: string,
    type: CashTransactionType,
    nextAmount: number,
  ): Promise<void> {
    if (type !== CashTransactionType.EXPENSE) {
      return;
    }

    const reimbursements = await this.transactionRepository.findByFilters({
      relatedExpenseId: transactionId,
      type: CashTransactionType.INCOME,
    });
    const totalReimbursed = reimbursements.reduce((sum, tx) => sum + tx.amount, 0);
    if (totalReimbursed > nextAmount) {
      throw new ValidationError(
        `El gasto no puede ser menor a sus reintegros vinculados (${totalReimbursed.toFixed(2)})`,
      );
    }
  }

  private async ensureExpenseCanBeDeleted(transaction: TransactionEntity): Promise<void> {
    if (transaction.type !== CashTransactionType.EXPENSE) {
      return;
    }
    const reimbursements = await this.transactionRepository.findByFilters({
      relatedExpenseId: transaction.id,
      type: CashTransactionType.INCOME,
    });
    if (reimbursements.length > 0) {
      throw new ValidationError(
        'Este gasto tiene reintegros vinculados. Eliminá o desvinculá esos ingresos primero.',
      );
    }
  }

  private async resolveCategoryIdForTransaction(
    userId: string,
    type: CashTransactionType,
    categoryId: string | undefined,
    relatedExpenseId: string | null | undefined,
  ): Promise<string> {
    if (type === CashTransactionType.INCOME && relatedExpenseId) {
      return this.ensureReimbursementCategory(userId);
    }

    if (!categoryId) {
      throw new ValidationError('El ID de categoría es requerido');
    }
    return categoryId;
  }

  private async ensureReimbursementCategory(userId: string): Promise<string> {
    const categories = await this.categoryRepository.findByFilters({
      userId,
      type: CashTransactionType.INCOME,
    });
    const existing = categories.find((c) => c.name === REIMBURSEMENT_CATEGORY && c.parentId === null);
    if (existing) {
      return existing.id;
    }

    const created = await this.categoryRepository.create({
      userId,
      name: REIMBURSEMENT_CATEGORY,
      type: CashTransactionType.INCOME,
      color: '#0ea5e9',
      icon: 'reimbursement',
    });
    return created.id;
  }
}
