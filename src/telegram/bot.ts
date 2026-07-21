import { Telegraf } from 'telegraf';
import type { FastifyBaseLogger } from 'fastify';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { telegramService } from '../services/index.js';
import {
  beginExpenseFlow,
  beginIncomeFlow,
  beginRegisterFlow,
  handleAmountInput,
  handleRegisterCallback,
  mainMenuKeyboard,
  sendMainMenu,
} from './registerFlow.js';
import { clearSession } from './session.js';

let bot: Telegraf | null = null;

function chatIdFromCtx(ctx: { chat?: { id: number } | undefined }): string | null {
  if (!ctx.chat) return null;
  return String(ctx.chat.id);
}

export async function startTelegramBot(log: FastifyBaseLogger): Promise<void> {
  if (!env.telegramToken) {
    log.warn('TOKEN_TELEGRAM no configurado: el bot de Telegram no se iniciará');
    return;
  }

  bot = new Telegraf(env.telegramToken);

  bot.start(async (ctx) => {
    const chatId = chatIdFromCtx(ctx);
    if (!chatId) return;

    const payload = ctx.startPayload?.trim();

    if (payload) {
      try {
        const user = await telegramService.linkFromStartPayload(payload, chatId);
        await ctx.reply(
          `Listo, ${user.name}. Tu cuenta quedó vinculada a Telegram.`,
          mainMenuKeyboard(),
        );
      } catch (error) {
        const message =
          error instanceof AppError
            ? error.message
            : 'El link no es válido o expiró. Generá uno nuevo desde la app.';
        await ctx.reply(message);
      }
      return;
    }

    await beginRegisterFlow(ctx);
  });

  bot.command('nuevo', async (ctx) => {
    await beginRegisterFlow(ctx);
  });

  bot.command('gasto', async (ctx) => {
    await beginExpenseFlow(ctx);
  });

  bot.command('ingreso', async (ctx) => {
    await beginIncomeFlow(ctx);
  });

  bot.command('cancelar', async (ctx) => {
    const chatId = chatIdFromCtx(ctx);
    if (!chatId) return;
    clearSession(chatId);
    const user = await telegramService.resolveUser(chatId);
    if (!user) {
      await ctx.reply(
        'Para usar el bot, conectá Telegram desde la configuración de la app.',
      );
      return;
    }
    await ctx.reply('Cancelado.');
    await sendMainMenu(ctx, user.name);
  });

  bot.on('callback_query', async (ctx) => {
    await handleRegisterCallback(ctx);
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;

    const chatId = chatIdFromCtx(ctx);
    if (!chatId) return;

    const user = await telegramService.resolveUser(chatId);
    if (!user) {
      await ctx.reply(
        'Para usar el bot, conectá Telegram desde la configuración de la app.',
      );
      return;
    }

    const handled = await handleAmountInput(ctx, ctx.message.text);
    if (handled) return;

    await ctx.reply(
      'Usá los botones para registrar, o /nuevo para empezar.',
      mainMenuKeyboard(),
    );
  });

  bot.catch((error, ctx) => {
    log.error({ err: error, updateType: ctx.updateType }, 'Error en bot de Telegram');
  });

  await bot.launch();
  log.info('Bot de Telegram iniciado (long polling)');
}

export async function stopTelegramBot(): Promise<void> {
  if (!bot) return;
  bot.stop('shutdown');
  bot = null;
}
