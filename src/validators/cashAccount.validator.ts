import { z } from 'zod';

export const createCashAccountSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(500).optional(),
  currency: z.string().length(3, 'La moneda debe ser un código de 3 letras').optional(),
  openingBalance: z.number().min(0, 'El saldo inicial no puede ser negativo').optional(),
});

export const updateCashAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  currency: z.string().length(3).optional(),
  openingBalance: z.number().min(0, 'El saldo inicial no puede ser negativo').optional(),
});

export const cashAccountIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateCashAccountInput = z.infer<typeof createCashAccountSchema>;
export type UpdateCashAccountInput = z.infer<typeof updateCashAccountSchema>;
