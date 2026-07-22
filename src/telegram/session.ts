import type { CashTransactionType, ExpenseIntent } from '../types/enums.js';

export type RegisterStep =
  | 'type'
  | 'category'
  | 'subcategory'
  | 'account'
  | 'intent'
  | 'amount';

export interface RegisterSession {
  userId: string;
  step: RegisterStep;
  type?: CashTransactionType;
  categoryId?: string;
  categoryName?: string;
  cashAccountId?: string;
  accountName?: string;
  intent?: ExpenseIntent;
  intentLabel?: string;
  updatedAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000;
const sessions = new Map<string, RegisterSession>();

export function getSession(chatId: string): RegisterSession | undefined {
  const session = sessions.get(chatId);
  if (!session) return undefined;

  if (Date.now() - session.updatedAt > SESSION_TTL_MS) {
    sessions.delete(chatId);
    return undefined;
  }

  return session;
}

export function setSession(chatId: string, session: RegisterSession): void {
  sessions.set(chatId, { ...session, updatedAt: Date.now() });
}

export function clearSession(chatId: string): void {
  sessions.delete(chatId);
}

export function startSession(chatId: string, userId: string): RegisterSession {
  const session: RegisterSession = {
    userId,
    step: 'type',
    updatedAt: Date.now(),
  };
  sessions.set(chatId, session);
  return session;
}
