import { z } from 'zod';
import { CashTransactionType } from '../types/enums.js';

const dateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

export const createTransactionSchema = z.object({
  cashAccountId: z.string().min(1, 'El ID de cuenta cash es requerido'),
  categoryId: z.string().min(1, 'El ID de categoría es requerido'),
  type: z.nativeEnum(CashTransactionType),
  amount: z.number().positive('El monto debe ser positivo'),
  date: dateSchema,
  description: z.string().max(500).optional(),
});

export const updateTransactionSchema = z.object({
  cashAccountId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  type: z.nativeEnum(CashTransactionType).optional(),
  amount: z.number().positive().optional(),
  date: dateSchema.optional(),
  description: z.string().max(500).optional().nullable(),
});

export const transactionIdParamSchema = z.object({
  id: z.string().min(1),
});

export const transactionQuerySchema = z.object({
  cashAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.nativeEnum(CashTransactionType).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;
