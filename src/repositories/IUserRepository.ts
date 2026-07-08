import type { CreateUserData, UserEntity, UserPublic } from '../models/index.js';

export interface IUserRepository {
  create(data: CreateUserData): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findPublicById(id: string): Promise<UserPublic | null>;
  existsByEmail(email: string): Promise<boolean>;
}
