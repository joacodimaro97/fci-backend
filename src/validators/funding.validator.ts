import { z } from 'zod';
import { FundingType } from '../types/enums.js';

const dateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

export const createFundingSchema = z.object({
  type: z.nativeEnum(FundingType),
  cashAccountId: z.string().min(1, 'La cuenta de efectivo es requerida'),
  investmentAccountId: z.string().min(1, 'La cuenta de inversión es requerida'),
  amount: z.number().positive('El monto debe ser positivo'),
  date: dateSchema,
  description: z.string().max(500).optional(),
});

export const fundingIdParamSchema = z.object({
  id: z.string().min(1),
});

export const fundingQuerySchema = z.object({
  cashAccountId: z.string().optional(),
  investmentAccountId: z.string().optional(),
  type: z.nativeEnum(FundingType).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateFundingInput = z.infer<typeof createFundingSchema>;
export type FundingQueryInput = z.infer<typeof fundingQuerySchema>;
