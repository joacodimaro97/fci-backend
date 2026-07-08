import { z } from 'zod';
import { CashTransactionType } from '../types/enums.js';

const booleanQuerySchema = z
  .union([z.boolean(), z.literal('true'), z.literal('false')])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true'));

export const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  type: z.nativeEnum(CashTransactionType),
  parentId: z.string().min(1).optional().nullable(),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.nativeEnum(CashTransactionType).optional(),
  parentId: z.string().min(1).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
});

export const categoryIdParamSchema = z.object({
  id: z.string().min(1),
});

export const categoryQuerySchema = z.object({
  type: z.nativeEnum(CashTransactionType).optional(),
  parentId: z.string().min(1).optional(),
  rootsOnly: booleanQuerySchema.optional(),
  tree: booleanQuerySchema.optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryQueryInput = z.output<typeof categoryQuerySchema>;
