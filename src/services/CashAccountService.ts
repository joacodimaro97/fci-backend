import { NotFoundError } from '../errors/AppError.js';
import type { CashAccountEntity } from '../models/index.js';
import type { ICashAccountRepository } from '../repositories/ICashAccountRepository.js';
import type {
  CreateCashAccountInput,
  UpdateCashAccountInput,
} from '../validators/cashAccount.validator.js';

export class CashAccountService {
  constructor(private readonly cashAccountRepository: ICashAccountRepository) {}

  async getAll(userId: string): Promise<CashAccountEntity[]> {
    return this.cashAccountRepository.findByUserId(userId);
  }

  async create(userId: string, input: CreateCashAccountInput): Promise<CashAccountEntity> {
    return this.cashAccountRepository.create({
      userId,
      name: input.name,
      description: input.description,
      currency: input.currency,
      openingBalance: input.openingBalance,
    });
  }

  async update(
    userId: string,
    cashAccountId: string,
    input: UpdateCashAccountInput,
  ): Promise<CashAccountEntity> {
    const account = await this.cashAccountRepository.findByIdAndUserId(cashAccountId, userId);
    if (!account) {
      throw new NotFoundError('Cuenta de efectivo');
    }
    return this.cashAccountRepository.update(cashAccountId, input);
  }

  async delete(userId: string, cashAccountId: string): Promise<void> {
    const account = await this.cashAccountRepository.findByIdAndUserId(cashAccountId, userId);
    if (!account) {
      throw new NotFoundError('Cuenta de efectivo');
    }
    await this.cashAccountRepository.delete(cashAccountId);
  }

  async verifyOwnership(userId: string, cashAccountId: string): Promise<CashAccountEntity> {
    const account = await this.cashAccountRepository.findByIdAndUserId(cashAccountId, userId);
    if (!account) {
      throw new NotFoundError('Cuenta de efectivo');
    }
    return account;
  }

  async getAccountIdsForUser(userId: string): Promise<string[]> {
    const accounts = await this.cashAccountRepository.findByUserId(userId);
    return accounts.map((a) => a.id);
  }
}
