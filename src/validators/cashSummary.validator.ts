import { z } from 'zod';

export const cashSummaryQuerySchema = z.object({
  cashAccountId: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export type CashSummaryQueryInput = z.infer<typeof cashSummaryQuerySchema>;
