import type { PrismaClient } from '@prisma/client';
import type { CreateUserData, UserEntity, UserPublic } from '../../models/index.js';
import { toPublicUser } from '../../utils/index.js';
import type { IUserRepository } from '../IUserRepository.js';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateUserData): Promise<UserEntity> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByTelegramChatId(chatId: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { telegramChatId: chatId } });
  }

  async findPublicById(id: string): Promise<UserPublic | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        telegramChatId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user ? toPublicUser(user) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email } });
    return count > 0;
  }

  async linkTelegram(userId: string, chatId: string): Promise<UserEntity> {
    return this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { telegramChatId: chatId, NOT: { id: userId } },
        data: { telegramChatId: null },
      });

      return tx.user.update({
        where: { id: userId },
        data: { telegramChatId: chatId },
      });
    });
  }

  async unlinkTelegram(userId: string): Promise<UserEntity> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: null },
    });
  }
}
