import { z } from 'zod';
import { MovementType } from '../types/enums.js';

export const createMovementSchema = z.object({
  accountId: z.string().min(1, 'El ID de cuenta es requerido'),
  type: z.nativeEnum(MovementType),
  amount: z.number().positive('El monto debe ser positivo'),
  date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  description: z.string().max(500).optional(),
});

export const updateMovementSchema = z.object({
  type: z.nativeEnum(MovementType).optional(),
  amount: z.number().positive().optional(),
  date: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  description: z.string().max(500).optional().nullable(),
});

export const movementIdParamSchema = z.object({
  id: z.string().min(1),
});

export const movementQuerySchema = z.object({
  accountId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type UpdateMovementInput = z.infer<typeof updateMovementSchema>;
export type MovementQueryInput = z.infer<typeof movementQuerySchema>;
