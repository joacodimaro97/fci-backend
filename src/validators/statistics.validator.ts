import { z } from 'zod';

export const statisticsQuerySchema = z.object({
  accountId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type StatisticsQueryInput = z.infer<typeof statisticsQuerySchema>;
