import { z } from 'zod';

export const createPerformanceSchema = z.object({
  accountId: z.string().min(1, 'El ID de cuenta es requerido'),
  date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  dailyReturnPercent: z.number(),
  dailyProfit: z.number(),
  shareValue: z.number().positive('El valor de cuotaparte debe ser positivo'),
  notes: z.string().max(500).optional(),
});

export const updatePerformanceSchema = z.object({
  date: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  dailyReturnPercent: z.number().optional(),
  dailyProfit: z.number().optional(),
  shareValue: z.number().positive().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const performanceIdParamSchema = z.object({
  id: z.string().min(1),
});

export const performanceQuerySchema = z.object({
  accountId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const performancePeriodQuerySchema = z.object({
  accountId: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type CreatePerformanceInput = z.infer<typeof createPerformanceSchema>;
export type UpdatePerformanceInput = z.infer<typeof updatePerformanceSchema>;
export type PerformanceQueryInput = z.infer<typeof performanceQuerySchema>;
export type PerformancePeriodQueryInput = z.infer<typeof performancePeriodQuerySchema>;
