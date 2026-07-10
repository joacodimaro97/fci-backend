import { NotFoundError, ValidationError } from '../errors/AppError.js';
import type { CashTransferWithDetails } from '../models/index.js';
import type { ICashAccountRepository } from '../repositories/ICashAccountRepository.js';
import type { ICashTransferRepository } from '../repositories/ICashTransferRepository.js';
import type { ICategoryRepository } from '../repositories/ICategoryRepository.js';
import { CashTransactionType } from '../types/enums.js';
import { endOfDay, parseDate, startOfDay } from '../utils/index.js';
import type {
  CreateTransferInput,
  TransferQueryInput,
} from '../validators/transfer.validator.js';

const TRANSFER_OUT_CATEGORY = 'Transferencia saliente';
const TRANSFER_IN_CATEGORY = 'Transferencia entrante';

export class TransferService {
  constructor(
    private readonly transferRepository: ICashTransferRepository,
    private readonly cashAccountRepository: ICashAccountRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async getAll(userId: string, query: TransferQueryInput): Promise<CashTransferWithDetails[]> {
    if (query.cashAccountId) {
      const account = await this.cashAccountRepository.findByIdAndUserId(
        query.cashAccountId,
        userId,
      );
      if (!account) {
        throw new NotFoundError('Cuenta de efectivo');
      }
    }

    return this.transferRepository.findByFilters({
      userId,
      cashAccountId: query.cashAccountId,
      startDate: query.startDate ? startOfDay(parseDate(query.startDate)) : undefined,
      endDate: query.endDate ? endOfDay(parseDate(query.endDate)) : undefined,
    });
  }

  async create(userId: string, input: CreateTransferInput): Promise<CashTransferWithDetails> {
    if (input.fromCashAccountId === input.toCashAccountId) {
      throw new ValidationError('La cuenta origen y destino deben ser distintas');
    }

    const fromAccount = await this.cashAccountRepository.findByIdAndUserId(
      input.fromCashAccountId,
      userId,
    );
    if (!fromAccount) {
      throw new NotFoundError('Cuenta de efectivo origen');
    }

    const toAccount = await this.cashAccountRepository.findByIdAndUserId(
      input.toCashAccountId,
      userId,
    );
    if (!toAccount) {
      throw new NotFoundError('Cuenta de efectivo destino');
    }

    if (fromAccount.currency !== toAccount.currency) {
      throw new ValidationError(
        `Las cuentas deben tener la misma moneda (${fromAccount.currency} vs ${toAccount.currency})`,
      );
    }

    const { outCategoryId, inCategoryId } = await this.ensureTransferCategories(userId);

    return this.transferRepository.create({
      userId,
      fromCashAccountId: input.fromCashAccountId,
      toCashAccountId: input.toCashAccountId,
      amount: input.amount,
      date: parseDate(input.date),
      description: input.description,
      outCategoryId,
      inCategoryId,
    });
  }

  async delete(userId: string, transferId: string): Promise<void> {
    const transfer = await this.transferRepository.findByIdAndUserId(transferId, userId);
    if (!transfer) {
      throw new NotFoundError('Transferencia');
    }
    await this.transferRepository.delete(transferId);
  }

  private async ensureTransferCategories(
    userId: string,
  ): Promise<{ outCategoryId: string; inCategoryId: string }> {
    const categories = await this.categoryRepository.findByFilters({ userId });

    let outCategory = categories.find(
      (c) => c.name === TRANSFER_OUT_CATEGORY && c.type === CashTransactionType.EXPENSE,
    );
    let inCategory = categories.find(
      (c) => c.name === TRANSFER_IN_CATEGORY && c.type === CashTransactionType.INCOME,
    );

    if (!outCategory) {
      outCategory = await this.categoryRepository.create({
        userId,
        name: TRANSFER_OUT_CATEGORY,
        type: CashTransactionType.EXPENSE,
        color: '#64748b',
        icon: 'transfer-out',
      });
    }

    if (!inCategory) {
      inCategory = await this.categoryRepository.create({
        userId,
        name: TRANSFER_IN_CATEGORY,
        type: CashTransactionType.INCOME,
        color: '#64748b',
        icon: 'transfer-in',
      });
    }

    return { outCategoryId: outCategory.id, inCategoryId: inCategory.id };
  }
}
