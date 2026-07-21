import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../errors/AppError.js';
import type { UserEntity, UserPublic } from '../models/index.js';
import type { IUserRepository } from '../repositories/IUserRepository.js';
import { toPublicUser } from '../utils/index.js';

const LINK_TTL_SECONDS = 5 * 60;
const SIG_LENGTH = 16;

export interface TelegramLinkResponse {
  deepLink: string;
  expiresAt: string;
}

export class TelegramService {
  constructor(private readonly userRepository: IUserRepository) {}

  async createLink(userId: string): Promise<TelegramLinkResponse> {
    if (!env.telegramBotUsername) {
      throw new ValidationError('TELEGRAM_BOT_USERNAME no está configurado');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario');
    }

    const expiresAtUnix = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
    const token = this.signLinkToken(userId, expiresAtUnix);

    return {
      deepLink: `https://t.me/${env.telegramBotUsername}?start=${token}`,
      expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
    };
  }

  async linkFromStartPayload(token: string, chatId: string): Promise<UserPublic> {
    const userId = this.verifyLinkToken(token);
    const user = await this.userRepository.linkTelegram(userId, chatId);
    return toPublicUser(user);
  }

  async unlink(userId: string): Promise<UserPublic> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario');
    }

    const updated = await this.userRepository.unlinkTelegram(userId);
    return toPublicUser(updated);
  }

  async getStatus(userId: string): Promise<{ linked: boolean }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Usuario');
    }
    return { linked: user.telegramChatId != null };
  }

  async resolveUser(chatId: string): Promise<UserEntity | null> {
    return this.userRepository.findByTelegramChatId(chatId);
  }

  private signLinkToken(userId: string, expiresAtUnix: number): string {
    const payload = `${userId}_${expiresAtUnix}`;
    const sig = this.hmac(payload).slice(0, SIG_LENGTH);
    return `${payload}_${sig}`;
  }

  private verifyLinkToken(token: string): string {
    const parts = token.split('_');
    if (parts.length < 3) {
      throw new UnauthorizedError('Link de Telegram inválido o expirado');
    }

    const sig = parts.pop()!;
    const expiresAtUnixStr = parts.pop()!;
    const userId = parts.join('_');
    const expiresAtUnix = Number(expiresAtUnixStr);

    if (!userId || !Number.isFinite(expiresAtUnix)) {
      throw new UnauthorizedError('Link de Telegram inválido o expirado');
    }

    if (expiresAtUnix < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedError('Link de Telegram inválido o expirado');
    }

    const expected = this.hmac(`${userId}_${expiresAtUnix}`).slice(0, SIG_LENGTH);
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);

    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      throw new UnauthorizedError('Link de Telegram inválido o expirado');
    }

    return userId;
  }

  private hmac(payload: string): string {
    return createHmac('sha256', env.jwtSecret).update(payload).digest('hex');
  }
}
