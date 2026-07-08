import { calculateDailyRate } from './rates.js';

export interface ProjectionInput {
  capitalInitial: number;
  monthlyContribution: number;
  annualRate: number;
  years: number;
}

export interface ProjectionDay {
  day: number;
  capital: number;
  profit: number;
  dailyRate: number;
}

/**
 * Proyecta el crecimiento del capital con tasa fija y aportes mensuales.
 */
export function projectFixedRate(input: ProjectionInput): ProjectionDay[] {
  const { capitalInitial, monthlyContribution, annualRate, years } = input;
  const dailyRate = calculateDailyRate(annualRate);
  const totalDays = years * 365;
  const results: ProjectionDay[] = [];

  let capital = capitalInitial;
  let lastContributionDay = 0;

  for (let day = 1; day <= totalDays; day++) {
    if (monthlyContribution > 0 && day - lastContributionDay >= 30) {
      capital += monthlyContribution;
      lastContributionDay = day;
    }

    const dailyProfit = capital * dailyRate;
    capital += dailyProfit;

    results.push({
      day,
      capital: round2(capital),
      profit: round2(dailyProfit),
      dailyRate,
    });
  }

  return results;
}

/**
 * Proyecta usando historial real de rendimientos diarios (cicla si es necesario).
 */
export function projectRealHistory(
  capitalInitial: number,
  monthlyContribution: number,
  historicalReturns: number[],
  years: number,
): ProjectionDay[] {
  if (historicalReturns.length === 0) {
    return projectFixedRate({
      capitalInitial,
      monthlyContribution,
      annualRate: 0,
      years,
    });
  }

  const totalDays = years * 365;
  const results: ProjectionDay[] = [];
  let capital = capitalInitial;
  let lastContributionDay = 0;

  for (let day = 1; day <= totalDays; day++) {
    if (monthlyContribution > 0 && day - lastContributionDay >= 30) {
      capital += monthlyContribution;
      lastContributionDay = day;
    }

    const dailyRate = historicalReturns[(day - 1) % historicalReturns.length]!;
    const dailyProfit = capital * dailyRate;
    capital += dailyProfit;

    results.push({
      day,
      capital: round2(capital),
      profit: round2(dailyProfit),
      dailyRate,
    });
  }

  return results;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
