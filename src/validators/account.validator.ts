import { z } from 'zod';
import { InvestmentType } from '../types/enums.js';

export const createAccountSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  description: z.string().max(500).optional(),
  currency: z.string().length(3, 'La moneda debe ser un código de 3 letras').optional(),
  investmentType: z.nativeEnum(InvestmentType),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  currency: z.string().length(3).optional(),
  investmentType: z.nativeEnum(InvestmentType).optional(),
});

export const accountIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
