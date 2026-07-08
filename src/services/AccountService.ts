import { NotFoundError } from '../errors/AppError.js';
import type { AccountEntity } from '../models/index.js';
import type { IAccountRepository } from '../repositories/IAccountRepository.js';
import type {
  CreateAccountInput,
  UpdateAccountInput,
} from '../validators/account.validator.js';

export class AccountService {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async getAll(userId: string): Promise<AccountEntity[]> {
    return this.accountRepository.findByUserId(userId);
  }

  async create(userId: string, input: CreateAccountInput): Promise<AccountEntity> {
    return this.accountRepository.create({
      userId,
      name: input.name,
      description: input.description,
      currency: input.currency,
      investmentType: input.investmentType,
    });
  }

  async update(userId: string, accountId: string, input: UpdateAccountInput): Promise<AccountEntity> {
    const account = await this.accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new NotFoundError('Cuenta');
    }
    return this.accountRepository.update(accountId, input);
  }

  async delete(userId: string, accountId: string): Promise<void> {
    const account = await this.accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new NotFoundError('Cuenta');
    }
    await this.accountRepository.delete(accountId);
  }

  async getAccountIdsForUser(userId: string): Promise<string[]> {
    const accounts = await this.accountRepository.findByUserId(userId);
    return accounts.map((a) => a.id);
  }

  async verifyAccountOwnership(userId: string, accountId: string): Promise<AccountEntity> {
    const account = await this.accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new NotFoundError('Cuenta');
    }
    return account;
  }
}
