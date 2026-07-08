import { SimulationType } from '../types/enums.js';
import { calculateDailyRate } from './rates.js';
import { projectFixedRate, projectRealHistory } from './projection.js';
import {
  generateCustomReturn,
  generateOptimisticReturn,
  generatePessimisticReturn,
} from './volatility.js';

export interface SimulationInput {
  simulationType: SimulationType;
  capitalInitial: number;
  monthlyContribution: number;
  annualRate?: number;
  years: number;
  historicalReturns?: number[];
  optimisticMin?: number;
  optimisticMax?: number;
  pessimisticMin?: number;
  pessimisticMax?: number;
  customMean?: number;
  customStdDev?: number;
  customLossProbability?: number;
}

export interface SimulationDayResult {
  day: number;
  capital: number;
  profit: number;
  dailyRate: number;
}

export interface SimulationOutput {
  simulationType: SimulationType;
  capitalInitial: number;
  monthlyContribution: number;
  years: number;
  finalCapital: number;
  totalProfit: number;
  totalReturn: number;
  results: SimulationDayResult[];
}

/**
 * Motor de simulación que soporta todos los tipos definidos.
 */
export function runSimulation(input: SimulationInput): SimulationOutput {
  const results = executeSimulation(input);
  const finalCapital = results.length > 0 ? results[results.length - 1]!.capital : input.capitalInitial;
  const totalProfit = finalCapital - input.capitalInitial - input.monthlyContribution * input.years * 12;
  const totalReturn =
    input.capitalInitial > 0 ? (finalCapital - input.capitalInitial) / input.capitalInitial : 0;

  return {
    simulationType: input.simulationType,
    capitalInitial: input.capitalInitial,
    monthlyContribution: input.monthlyContribution,
    years: input.years,
    finalCapital: round2(finalCapital),
    totalProfit: round2(totalProfit),
    totalReturn: round4(totalReturn),
    results,
  };
}

function executeSimulation(input: SimulationInput): SimulationDayResult[] {
  switch (input.simulationType) {
    case SimulationType.FIXED:
      return runFixedSimulation(input);
    case SimulationType.REAL_HISTORY:
      return runRealHistorySimulation(input);
    case SimulationType.OPTIMISTIC:
      return runOptimisticSimulation(input);
    case SimulationType.PESSIMISTIC:
      return runPessimisticSimulation(input);
    case SimulationType.CUSTOM:
      return runCustomSimulation(input);
    default:
      return runFixedSimulation(input);
  }
}

function runFixedSimulation(input: SimulationInput): SimulationDayResult[] {
  const annualRate = input.annualRate ?? 0;
  return projectFixedRate({
    capitalInitial: input.capitalInitial,
    monthlyContribution: input.monthlyContribution,
    annualRate,
    years: input.years,
  });
}

function runRealHistorySimulation(input: SimulationInput): SimulationDayResult[] {
  return projectRealHistory(
    input.capitalInitial,
    input.monthlyContribution,
    input.historicalReturns ?? [],
    input.years,
  );
}

function runOptimisticSimulation(input: SimulationInput): SimulationDayResult[] {
  const minRate = input.optimisticMin ?? 0.0005;
  const maxRate = input.optimisticMax ?? 0.003;
  return runRandomSimulation(input, () => generateOptimisticReturn(minRate, maxRate));
}

function runPessimisticSimulation(input: SimulationInput): SimulationDayResult[] {
  const minRate = input.pessimisticMin ?? -0.005;
  const maxRate = input.pessimisticMax ?? 0.001;
  return runRandomSimulation(input, () => generatePessimisticReturn(minRate, maxRate));
}

function runCustomSimulation(input: SimulationInput): SimulationDayResult[] {
  const mean = input.customMean ?? 0.001;
  const stdDev = input.customStdDev ?? 0.002;
  const lossProbability = input.customLossProbability ?? 0.3;
  return runRandomSimulation(input, () =>
    generateCustomReturn(mean, stdDev, lossProbability),
  );
}

function runRandomSimulation(
  input: SimulationInput,
  rateGenerator: () => number,
): SimulationDayResult[] {
  const totalDays = input.years * 365;
  const results: SimulationDayResult[] = [];
  let capital = input.capitalInitial;
  let lastContributionDay = 0;

  for (let day = 1; day <= totalDays; day++) {
    if (input.monthlyContribution > 0 && day - lastContributionDay >= 30) {
      capital += input.monthlyContribution;
      lastContributionDay = day;
    }

    const dailyRate = rateGenerator();
    const dailyProfit = capital * dailyRate;
    capital += dailyProfit;

    results.push({
      day,
      capital: round2(capital),
      profit: round2(dailyProfit),
      dailyRate: round6(dailyRate),
    });
  }

  return results;
}

export { calculateDailyRate };

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function round6(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}
