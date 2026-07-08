import type {
  CreateMovementData,
  MovementEntity,
  UpdateMovementData,
} from '../models/index.js';

export interface MovementFilters {
  accountId?: string;
  accountIds?: string[];
  startDate?: Date;
  endDate?: Date;
}

export interface IMovementRepository {
  create(data: CreateMovementData): Promise<MovementEntity>;
  findById(id: string): Promise<MovementEntity | null>;
  findByFilters(filters: MovementFilters): Promise<MovementEntity[]>;
  findByIdAndAccountIds(id: string, accountIds: string[]): Promise<MovementEntity | null>;
  update(id: string, data: UpdateMovementData): Promise<MovementEntity>;
  delete(id: string): Promise<void>;
}
