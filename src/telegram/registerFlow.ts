import { Markup } from 'telegraf';
import type { Context } from 'telegraf';
import { AppError } from '../errors/AppError.js';
import type { CategoryEntity } from '../models/index.js';
import {
  cashAccountService,
  categoryService,
  telegramService,
  transactionService,
} from '../services/index.js';
import { CashTransactionType } from '../types/enums.js';
import { todayCalendarDate } from '../utils/index.js';
import {
  clearSession,
  getSession,
  setSession,
  startSession,
  type RegisterSession,
} from './session.js';

const CANCEL_ROW = [Markup.button.callback('❌ Cancelar', 'reg:cancel')];

function typeLabel(type: CashTransactionType): string {
  return type === CashTransactionType.EXPENSE ? 'Gasto' : 'Ingreso';
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(amount);
}

function dateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function chunkButtons(
  buttons: ReturnType<typeof Markup.button.callback>[],
  perRow = 1,
) {
  const rows: (typeof buttons)[] = [];
  for (let i = 0; i < buttons.length; i += perRow) {
    rows.push(buttons.slice(i, i + perRow));
  }
  return rows;
}

export function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💸 Gasto', 'reg:type:EXPENSE')],
    [Markup.button.callback('💰 Ingreso', 'reg:type:INCOME')],
  ]);
}

export async function sendMainMenu(ctx: Context, name?: string): Promise<void> {
  const greeting = name ? `Hola ${name}. ` : '';
  await ctx.reply(`${greeting}¿Qué querés registrar?`, mainMenuKeyboard());
}

async function ensureLinkedUser(ctx: Context): Promise<{
  chatId: string;
  userId: string;
  name: string;
} | null> {
  const chatId = ctx.chat ? String(ctx.chat.id) : null;
  if (!chatId) return null;

  const user = await telegramService.resolveUser(chatId);
  if (!user) {
    await ctx.reply(
      'Para usar el bot, conectá Telegram desde la configuración de la app.',
    );
    return null;
  }

  return { chatId, userId: user.id, name: user.name };
}

async function showRootCategories(ctx: Context, session: RegisterSession): Promise<void> {
  const categories = (await categoryService.getAll(session.userId, {
    type: session.type,
    rootsOnly: true,
  })) as CategoryEntity[];

  if (categories.length === 0) {
    clearSession(String(ctx.chat!.id));
    await ctx.reply(
      `No tenés categorías de ${typeLabel(session.type!).toLowerCase()}. Creálas en la app primero.`,
    );
    return;
  }

  const buttons = categories.map((cat) =>
    Markup.button.callback(cat.name, `reg:cat:${cat.id}`),
  );

  await ctx.reply(
    `Elegí la categoría (${typeLabel(session.type!)}):`,
    Markup.inlineKeyboard([...chunkButtons(buttons), CANCEL_ROW]),
  );
}

async function showAccounts(ctx: Context, session: RegisterSession): Promise<void> {
  const chatId = String(ctx.chat!.id);
  const accounts = await cashAccountService.getAll(session.userId);

  if (accounts.length === 0) {
    clearSession(chatId);
    await ctx.reply('No tenés cuentas de efectivo. Creá una en la app primero.');
    return;
  }

  if (accounts.length === 1) {
    const account = accounts[0]!;
    session.cashAccountId = account.id;
    session.accountName = account.name;
    session.step = 'amount';
    setSession(chatId, session);
    await askAmount(ctx, session);
    return;
  }

  session.step = 'account';
  setSession(chatId, session);

  const buttons = accounts.map((account) =>
    Markup.button.callback(account.name, `reg:acc:${account.id}`),
  );

  await ctx.reply(
    'Elegí la cuenta:',
    Markup.inlineKeyboard([...chunkButtons(buttons), CANCEL_ROW]),
  );
}

async function askAmount(ctx: Context, session: RegisterSession): Promise<void> {
  await ctx.reply(
    [
      `Monto del ${typeLabel(session.type!).toLowerCase()}:`,
      `📁 ${session.categoryName}`,
      `🏦 ${session.accountName}`,
      '',
      'Escribí solo el número (ej: 1500 o 1500.50)',
    ].join('\n'),
    Markup.inlineKeyboard([CANCEL_ROW]),
  );
}

export async function handleRegisterCallback(ctx: Context): Promise<void> {
  const data =
    ctx.callbackQuery && 'data' in ctx.callbackQuery
      ? ctx.callbackQuery.data
      : undefined;

  if (!data?.startsWith('reg:')) return;

  await ctx.answerCbQuery();

  const linked = await ensureLinkedUser(ctx);
  if (!linked) return;

  const { chatId, userId, name } = linked;

  if (data === 'reg:cancel') {
    clearSession(chatId);
    await ctx.reply('Cancelado.');
    await sendMainMenu(ctx, name);
    return;
  }

  if (data === 'reg:menu' || data === 'reg:again') {
    startSession(chatId, userId);
    await sendMainMenu(ctx);
    return;
  }

  if (data.startsWith('reg:type:')) {
    const type = data.replace('reg:type:', '') as CashTransactionType;
    if (type !== CashTransactionType.EXPENSE && type !== CashTransactionType.INCOME) {
      await ctx.reply('Opción inválida.');
      return;
    }

    await beginTypeFlow(ctx, chatId, userId, type);
    return;
  }

  if (data.startsWith('reg:cat:')) {
    const categoryId = data.replace('reg:cat:', '');
    const session = getSession(chatId);
    if (!session?.type || (session.step !== 'category' && session.step !== 'subcategory')) {
      await ctx.reply('Empezá de nuevo:', mainMenuKeyboard());
      return;
    }

    let selected: CategoryEntity;
    try {
      selected = await categoryService.verifyOwnership(userId, categoryId);
    } catch {
      await ctx.reply('Categoría no encontrada. Empezá de nuevo:', mainMenuKeyboard());
      clearSession(chatId);
      return;
    }

    if (selected.type !== session.type) {
      await ctx.reply('Categoría inválida para este tipo. Empezá de nuevo:', mainMenuKeyboard());
      clearSession(chatId);
      return;
    }

    const children = (await categoryService.getAll(userId, {
      type: session.type,
      parentId: selected.id,
    })) as CategoryEntity[];

    if (children.length > 0 && session.step === 'category') {
      session.step = 'subcategory';
      session.categoryId = selected.id;
      session.categoryName = selected.name;
      setSession(chatId, session);

      const buttons = [
        Markup.button.callback(`Usar “${selected.name}”`, `reg:use:${selected.id}`),
        ...children.map((child) =>
          Markup.button.callback(child.name, `reg:cat:${child.id}`),
        ),
      ];

      await ctx.reply(
        `“${selected.name}” tiene subcategorías. Elegí una:`,
        Markup.inlineKeyboard([...chunkButtons(buttons), CANCEL_ROW]),
      );
      return;
    }

    session.categoryId = selected.id;
    session.categoryName = selected.name;
    setSession(chatId, session);
    await showAccounts(ctx, session);
    return;
  }

  if (data.startsWith('reg:use:')) {
    const categoryId = data.replace('reg:use:', '');
    const session = getSession(chatId);
    if (!session?.type) {
      await ctx.reply('Empezá de nuevo:', mainMenuKeyboard());
      return;
    }

    let selected: CategoryEntity;
    try {
      selected = await categoryService.verifyOwnership(userId, categoryId);
    } catch {
      await ctx.reply('Categoría no encontrada.');
      clearSession(chatId);
      return;
    }

    session.categoryId = selected.id;
    session.categoryName = selected.name;
    setSession(chatId, session);
    await showAccounts(ctx, session);
    return;
  }

  if (data.startsWith('reg:acc:')) {
    const accountId = data.replace('reg:acc:', '');
    const session = getSession(chatId);
    if (!session?.type || !session.categoryId || session.step !== 'account') {
      await ctx.reply('Empezá de nuevo:', mainMenuKeyboard());
      return;
    }

    let account;
    try {
      account = await cashAccountService.verifyOwnership(userId, accountId);
    } catch {
      await ctx.reply('Cuenta no encontrada.');
      clearSession(chatId);
      return;
    }

    session.cashAccountId = account.id;
    session.accountName = account.name;
    session.step = 'amount';
    setSession(chatId, session);
    await askAmount(ctx, session);
  }
}

export async function handleAmountInput(ctx: Context, text: string): Promise<boolean> {
  const chatId = ctx.chat ? String(ctx.chat.id) : null;
  if (!chatId) return false;

  const session = getSession(chatId);
  if (!session || session.step !== 'amount') return false;

  const normalized = text.trim().replace(/\s/g, '').replace(',', '.');
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    await ctx.reply(
      'Monto inválido. Escribí un número positivo (ej: 1500 o 1500.50).',
      Markup.inlineKeyboard([CANCEL_ROW]),
    );
    return true;
  }

  if (!session.type || !session.categoryId || !session.cashAccountId) {
    clearSession(chatId);
    await ctx.reply('Se perdió el progreso. Empezá de nuevo:', mainMenuKeyboard());
    return true;
  }

  try {
    await transactionService.create(session.userId, {
      type: session.type,
      categoryId: session.categoryId,
      cashAccountId: session.cashAccountId,
      amount,
      date: dateOnly(todayCalendarDate()),
    });

    clearSession(chatId);

    await ctx.reply(
      [
        `✅ ${typeLabel(session.type)} registrado`,
        `${formatMoney(amount)}`,
        `📁 ${session.categoryName}`,
        `🏦 ${session.accountName}`,
      ].join('\n'),
      Markup.inlineKeyboard([[Markup.button.callback('➕ Registrar otro', 'reg:again')]]),
    );
  } catch (error) {
    const message =
      error instanceof AppError
        ? error.message
        : 'No se pudo registrar. Probá de nuevo.';
    await ctx.reply(message);
    clearSession(chatId);
    await sendMainMenu(ctx);
  }

  return true;
}

async function beginTypeFlow(
  ctx: Context,
  chatId: string,
  userId: string,
  type: CashTransactionType,
): Promise<void> {
  const session = startSession(chatId, userId);
  session.type = type;
  session.step = 'category';
  setSession(chatId, session);
  await showRootCategories(ctx, session);
}

export async function beginRegisterFlow(ctx: Context): Promise<void> {
  const linked = await ensureLinkedUser(ctx);
  if (!linked) return;

  startSession(linked.chatId, linked.userId);
  await sendMainMenu(ctx, linked.name);
}

/** Arranca directo el flujo de gasto (categoría → cuenta → monto). */
export async function beginExpenseFlow(ctx: Context): Promise<void> {
  const linked = await ensureLinkedUser(ctx);
  if (!linked) return;

  await beginTypeFlow(
    ctx,
    linked.chatId,
    linked.userId,
    CashTransactionType.EXPENSE,
  );
}

/** Arranca directo el flujo de ingreso. */
export async function beginIncomeFlow(ctx: Context): Promise<void> {
  const linked = await ensureLinkedUser(ctx);
  if (!linked) return;

  await beginTypeFlow(
    ctx,
    linked.chatId,
    linked.userId,
    CashTransactionType.INCOME,
  );
}
