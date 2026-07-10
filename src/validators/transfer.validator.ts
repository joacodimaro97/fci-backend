import { z } from 'zod';

const dateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

export const createTransferSchema = z.object({
  fromCashAccountId: z.string().min(1, 'La cuenta origen es requerida'),
  toCashAccountId: z.string().min(1, 'La cuenta destino es requerida'),
  amount: z.number().positive('El monto debe ser positivo'),
  date: dateSchema,
  description: z.string().max(500).optional(),
});

export const transferIdParamSchema = z.object({
  id: z.string().min(1),
});

export const transferQuerySchema = z.object({
  cashAccountId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type TransferQueryInput = z.infer<typeof transferQuerySchema>;
