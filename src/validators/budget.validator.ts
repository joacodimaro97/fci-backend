import { z } from 'zod';

const dateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

export const createBudgetSchema = z
  .object({
    cashAccountId: z.string().min(1).optional().nullable(),
    categoryIds: z.array(z.string().min(1)).min(1).optional(),
    name: z.string().min(1, 'El nombre es requerido').max(100),
    amount: z.number().positive('El monto debe ser positivo').optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema,
  })
  .refine((data) => Boolean(data.cashAccountId) || (data.categoryIds?.length ?? 0) > 0, {
    message: 'Indicá una cuenta de efectivo y/o al menos una categoría',
  })
  .refine((data) => !(data.categoryIds && data.categoryIds.length > 0 && data.amount === undefined), {
    message: 'El monto es requerido cuando el presupuesto tiene categorías',
  });

export const updateBudgetSchema = z.object({
  cashAccountId: z.string().min(1).optional().nullable(),
  categoryIds: z.array(z.string().min(1)).optional(),
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
});

export const budgetIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
