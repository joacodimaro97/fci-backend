import { z } from 'zod';
import { CreditDirection, CreditStatus, InstallmentStatus } from '../types/enums.js';

const dateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

export const createCreditSchema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido').max(200),
    description: z.string().max(500).optional(),
    counterparty: z.string().max(200).optional(),
    direction: z.nativeEnum(CreditDirection),
    currency: z.string().min(1).max(10).optional(),
    principal: z.number().positive('El monto total debe ser positivo'),
    installmentCount: z.number().int().min(1).max(360),
    startDate: dateSchema,
    dueDates: z.array(dateSchema).optional(),
    defaultCashAccountId: z.string().min(1).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.dueDates && data.dueDates.length !== data.installmentCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `dueDates debe tener exactamente ${data.installmentCount} fechas`,
        path: ['dueDates'],
      });
    }
  });

export const updateCreditSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  counterparty: z.string().max(200).optional().nullable(),
  defaultCashAccountId: z.string().min(1).optional().nullable(),
});

export const creditIdParamSchema = z.object({
  id: z.string().min(1),
});

export const installmentParamsSchema = z.object({
  id: z.string().min(1),
  installmentId: z.string().min(1),
});

export const updateInstallmentSchema = z.object({
  dueDate: dateSchema,
});

export const payInstallmentSchema = z.object({
  cashAccountId: z.string().min(1, 'La cuenta de efectivo es requerida'),
  date: dateSchema.optional(),
  description: z.string().max(500).optional(),
});

export const creditQuerySchema = z.object({
  direction: z.nativeEnum(CreditDirection).optional(),
  status: z.nativeEnum(CreditStatus).optional(),
  currency: z.string().optional(),
});

export const calendarQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  direction: z.nativeEnum(CreditDirection).optional(),
  status: z.nativeEnum(InstallmentStatus).optional(),
});

export const summaryQuerySchema = z.object({
  upcomingLimit: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return 10;
      const n = Number(v);
      return Number.isFinite(n) ? n : 10;
    })
    .pipe(z.number().int().min(1).max(50)),
});

export type CreateCreditInput = z.infer<typeof createCreditSchema>;
export type UpdateCreditInput = z.infer<typeof updateCreditSchema>;
export type UpdateInstallmentInput = z.infer<typeof updateInstallmentSchema>;
export type PayInstallmentInput = z.infer<typeof payInstallmentSchema>;
export type CreditQueryInput = z.infer<typeof creditQuerySchema>;
export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;
export type SummaryQueryInput = z.infer<typeof summaryQuerySchema>;
