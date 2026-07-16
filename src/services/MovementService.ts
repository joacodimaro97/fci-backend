import { NotFoundError, ValidationError } from '../errors/AppError.js';
import type { MovementEntity } from '../models/index.js';
import type { IAccountRepository } from '../repositories/IAccountRepository.js';
import type { IMovementRepository } from '../repositories/IMovementRepository.js';
import { endOfDay, parseDate, startOfDay } from '../utils/index.js';
import type {
  CreateMovementInput,
  MovementQueryInput,
  UpdateMovementInput,
} from '../validators/movement.validator.js';

export class MovementService {
  constructor(
    private readonly movementRepository: IMovementRepository,
    private readonly accountRepository: IAccountRepository,
  ) {}

  async getAll(userId: string, query: MovementQueryInput): Promise<MovementEntity[]> {
    const accountIds = await this.getFilteredAccountIds(userId, query.accountId);

    return this.movementRepository.findByFilters({
      accountIds,
      startDate: query.startDate ? startOfDay(parseDate(query.startDate)) : undefined,
      endDate: query.endDate ? endOfDay(parseDate(query.endDate)) : undefined,
    });
  }

  async create(userId: string, input: CreateMovementInput): Promise<MovementEntity> {
    await this.verifyAccountOwnership(userId, input.accountId);

    return this.movementRepository.create({
      accountId: input.accountId,
      type: input.type,
      amount: input.amount,
      date: parseDate(input.date),
      description: input.description,
    });
  }

  async update(userId: string, movementId: string, input: UpdateMovementInput): Promise<MovementEntity> {
    const accountIds = await this.getUserAccountIds(userId);
    const movement = await this.movementRepository.findByIdAndAccountIds(movementId, accountIds);
    if (!movement) {
      throw new NotFoundError('Movimiento');
    }

    if (movement.fundingId) {
      throw new ValidationError(
        'Este movimiento pertenece a un registro efectivo↔inversión. Eliminá el registro en /fundings',
      );
    }

    return this.movementRepository.update(movementId, {
      type: input.type,
      amount: input.amount,
      date: input.date ? parseDate(input.date) : undefined,
      description: input.description,
    });
  }

  async delete(userId: string, movementId: string): Promise<void> {
    const accountIds = await this.getUserAccountIds(userId);
    const movement = await this.movementRepository.findByIdAndAccountIds(movementId, accountIds);
    if (!movement) {
      throw new NotFoundError('Movimiento');
    }

    if (movement.fundingId) {
      throw new ValidationError(
        'Este movimiento pertenece a un registro efectivo↔inversión. Eliminá el registro en /fundings',
      );
    }

    await this.movementRepository.delete(movementId);
  }

  private async getUserAccountIds(userId: string): Promise<string[]> {
    const accounts = await this.accountRepository.findByUserId(userId);
    return accounts.map((a) => a.id);
  }

  private async getFilteredAccountIds(userId: string, accountId?: string): Promise<string[]> {
    if (accountId) {
      await this.verifyAccountOwnership(userId, accountId);
      return [accountId];
    }
    return this.getUserAccountIds(userId);
  }

  private async verifyAccountOwnership(userId: string, accountId: string): Promise<void> {
    const account = await this.accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new NotFoundError('Cuenta');
    }
  }
}
