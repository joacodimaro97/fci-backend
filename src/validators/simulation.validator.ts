import { z } from 'zod';
import { SimulationType } from '../types/enums.js';

const baseSimulationSchema = z.object({
  accountId: z.string().min(1, 'El ID de cuenta es requerido'),
  name: z.string().min(1).max(100).optional(),
  simulationType: z.nativeEnum(SimulationType),
  capitalInitial: z.number().min(0, 'El capital inicial no puede ser negativo'),
  monthlyContribution: z.number().min(0).optional(),
  annualRate: z.number().optional(),
  years: z.number().int().min(1).max(50, 'Máximo 50 años'),
  optimisticMin: z.number().optional(),
  optimisticMax: z.number().optional(),
  pessimisticMin: z.number().optional(),
  pessimisticMax: z.number().optional(),
  customMean: z.number().optional(),
  customStdDev: z.number().min(0).optional(),
  customLossProbability: z.number().min(0).max(1).optional(),
});

export const runSimulationSchema = baseSimulationSchema.refine(
  (data) => {
    if (data.simulationType === SimulationType.FIXED) {
      return data.annualRate !== undefined;
    }
    return true;
  },
  { message: 'annualRate es requerido para simulaciones FIXED', path: ['annualRate'] },
);

export const saveSimulationSchema = baseSimulationSchema
  .extend({
    name: z.string().min(1).max(100),
  })
  .refine(
    (data) => {
      if (data.simulationType === SimulationType.FIXED) {
        return data.annualRate !== undefined;
      }
      return true;
    },
    { message: 'annualRate es requerido para simulaciones FIXED', path: ['annualRate'] },
  );

export const simulationIdParamSchema = z.object({
  id: z.string().min(1),
});

export const simulationQuerySchema = z.object({
  accountId: z.string().optional(),
});

export interface RunSimulationInput {
  accountId: string;
  name?: string;
  simulationType: SimulationType;
  capitalInitial: number;
  monthlyContribution?: number;
  annualRate?: number;
  years: number;
  optimisticMin?: number;
  optimisticMax?: number;
  pessimisticMin?: number;
  pessimisticMax?: number;
  customMean?: number;
  customStdDev?: number;
  customLossProbability?: number;
}

export interface SaveSimulationInput extends RunSimulationInput {
  name: string;
}

export type SimulationQueryInput = z.infer<typeof simulationQuerySchema>;
