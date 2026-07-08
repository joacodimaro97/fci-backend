import {
  calculateAverage,
  calculateCAGR,
  calculateStandardDeviation,
  calculateTEA,
  calculateTNA,
  calculateVolatility,
} from './rates.js';
import { calculateDrawdown } from './drawdown.js';

export interface PerformanceRecord {
  date: Date;
  dailyReturnPercent: number;
  dailyProfit: number;
  shareValue: number;
}

export interface MovementRecord {
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  date: Date;
}

export interface StatisticsInput {
  performances: PerformanceRecord[];
  movements: MovementRecord[];
  currentCapital?: number;
}

export interface DayExtreme {
  date: Date;
  value: number;
}

export interface MonthExtreme {
  year: number;
  month: number;
  returnPercent: number;
}

export interface StatisticsResult {
  capitalActual: number;
  capitalInvertido: number;
  ganancia: number;
  rentabilidad: number;
  tea: number;
  tna: number;
  promedioDiario: number;
  promedioMensual: number;
  volatilidad: number;
  desvioEstandar: number;
  diasPositivos: number;
  diasNegativos: number;
  mejorDia: DayExtreme | null;
  peorDia: DayExtreme | null;
  mejorMes: MonthExtreme | null;
  peorMes: MonthExtreme | null;
  drawdown: number;
  cagr: number;
}

/**
 * Motor de estadísticas financieras.
 */
export function calculateStatistics(input: StatisticsInput): StatisticsResult {
  const { performances, movements } = input;

  const capitalInvertido = calculateInvestedCapital(movements);
  const capitalActual = input.currentCapital ?? calculateCurrentCapital(performances, capitalInvertido);
  const ganancia = capitalActual - capitalInvertido;
  const rentabilidad = capitalInvertido > 0 ? ganancia / capitalInvertido : 0;

  const dailyReturns = performances.map((p) => p.dailyReturnPercent / 100);
  const promedioDiario = calculateAverage(dailyReturns);
  const desvioEstandar = calculateStandardDeviation(dailyReturns);
  const volatilidad = calculateVolatility(dailyReturns);

  const diasPositivos = dailyReturns.filter((r) => r > 0).length;
  const diasNegativos = dailyReturns.filter((r) => r < 0).length;

  const mejorDia = findBestDay(performances);
  const peorDia = findWorstDay(performances);
  const monthlyReturns = aggregateMonthlyReturns(performances);
  const mejorMes = findBestMonth(monthlyReturns);
  const peorMes = findWorstMonth(monthlyReturns);
  const promedioMensual = calculateAverage(monthlyReturns.map((m) => m.returnPercent / 100));

  const drawdownPoints = performances.map((p) => ({
    date: p.date,
    value: p.shareValue,
  }));
  const drawdownResult = calculateDrawdown(drawdownPoints);

  const years =
    performances.length > 0
      ? (performances[performances.length - 1]!.date.getTime() - performances[0]!.date.getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
      : 0;
  const cagr = calculateCAGR(capitalInvertido, capitalActual, Math.max(years, 1 / 365));

  const annualReturn = rentabilidad;
  const tea = calculateTEA(annualReturn);
  const tna = calculateTNA(annualReturn);

  return {
    capitalActual: round2(capitalActual),
    capitalInvertido: round2(capitalInvertido),
    ganancia: round2(ganancia),
    rentabilidad: round4(rentabilidad),
    tea: round4(tea),
    tna: round4(tna),
    promedioDiario: round6(promedioDiario),
    promedioMensual: round6(promedioMensual),
    volatilidad: round4(volatilidad),
    desvioEstandar: round6(desvioEstandar),
    diasPositivos,
    diasNegativos,
    mejorDia,
    peorDia,
    mejorMes,
    peorMes,
    drawdown: round4(drawdownResult.maxDrawdownPercent),
    cagr: round4(cagr),
  };
}

function calculateInvestedCapital(movements: MovementRecord[]): number {
  return movements.reduce((total, m) => {
    if (m.type === 'DEPOSIT') {
      return total + m.amount;
    }
    return total - m.amount;
  }, 0);
}

function calculateCurrentCapital(
  performances: PerformanceRecord[],
  investedCapital: number,
): number {
  if (performances.length === 0) {
    return investedCapital;
  }
  const lastPerformance = performances[performances.length - 1]!;
  return lastPerformance.shareValue;
}

function findBestDay(performances: PerformanceRecord[]): DayExtreme | null {
  if (performances.length === 0) {
    return null;
  }
  const best = performances.reduce((max, p) =>
    p.dailyReturnPercent > max.dailyReturnPercent ? p : max,
  );
  return { date: best.date, value: best.dailyReturnPercent };
}

function findWorstDay(performances: PerformanceRecord[]): DayExtreme | null {
  if (performances.length === 0) {
    return null;
  }
  const worst = performances.reduce((min, p) =>
    p.dailyReturnPercent < min.dailyReturnPercent ? p : min,
  );
  return { date: worst.date, value: worst.dailyReturnPercent };
}

interface MonthlyReturn {
  year: number;
  month: number;
  returnPercent: number;
}

function aggregateMonthlyReturns(performances: PerformanceRecord[]): MonthlyReturn[] {
  const monthlyMap = new Map<string, number[]>();

  for (const p of performances) {
    const key = `${p.date.getFullYear()}-${p.date.getMonth()}`;
    const existing = monthlyMap.get(key) ?? [];
    existing.push(p.dailyReturnPercent);
    monthlyMap.set(key, existing);
  }

  const result: MonthlyReturn[] = [];
  for (const [key, returns] of monthlyMap) {
    const [yearStr, monthStr] = key.split('-');
    const compounded = returns.reduce((acc, r) => acc * (1 + r / 100), 1);
    result.push({
      year: Number(yearStr),
      month: Number(monthStr) + 1,
      returnPercent: (compounded - 1) * 100,
    });
  }

  return result;
}

function findBestMonth(monthlyReturns: MonthlyReturn[]): MonthExtreme | null {
  if (monthlyReturns.length === 0) {
    return null;
  }
  const best = monthlyReturns.reduce((max, m) =>
    m.returnPercent > max.returnPercent ? m : max,
  );
  return { year: best.year, month: best.month, returnPercent: best.returnPercent };
}

function findWorstMonth(monthlyReturns: MonthlyReturn[]): MonthExtreme | null {
  if (monthlyReturns.length === 0) {
    return null;
  }
  const worst = monthlyReturns.reduce((min, m) =>
    m.returnPercent < min.returnPercent ? m : min,
  );
  return { year: worst.year, month: worst.month, returnPercent: worst.returnPercent };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function round6(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}
