import { z } from 'zod';

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const cashSummaryQuerySchema = z.object({
  cashAccountId: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export const intentReportQuerySchema = z
  .object({
    cashAccountId: z.string().optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.startDate && !data.endDate) || (!data.startDate && data.endDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate y endDate deben enviarse juntos',
        path: ['startDate'],
      });
    }
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate no puede ser posterior a endDate',
        path: ['startDate'],
      });
    }
    if (data.startDate && (data.year !== undefined || data.month !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Usá startDate/endDate o year/month, no ambos',
        path: ['startDate'],
      });
    }
  });

export type CashSummaryQueryInput = z.infer<typeof cashSummaryQuerySchema>;
export type IntentReportQueryInput = z.infer<typeof intentReportQuerySchema>;
