import { describe, it, expect } from 'vitest';
import {
  calculateDailyRate,
  calculateMonthlyRate,
  calculateAnnualRate,
  calculateTEA,
  calculateTNA,
  calculateCAGR,
  calculateAverage,
  calculateMedian,
  calculateVariance,
  calculateStandardDeviation,
  calculateVolatility,
  futureValue,
  compoundInterest,
  calculateSharpeRatio,
  calculateSortinoRatio,
} from '../src/finance/rates.js';
import { calculateDrawdown } from '../src/finance/drawdown.js';
import { runSimulation } from '../src/finance/simulationEngine.js';
import { calculateStatistics } from '../src/finance/statisticsEngine.js';
import { SimulationType } from '../src/types/enums.js';

describe('Finance - Rates', () => {
  it('calculateDailyRate convierte tasa anual a diaria', () => {
    const daily = calculateDailyRate(0.12);
    expect(daily).toBeGreaterThan(0);
    expect(daily).toBeLessThan(0.12);
  });

  it('calculateMonthlyRate convierte tasa anual a mensual', () => {
    const monthly = calculateMonthlyRate(0.12);
    expect(monthly).toBeGreaterThan(0);
    expect(monthly).toBeLessThan(0.12);
  });

  it('calculateAnnualRate convierte tasa diaria a anual', () => {
    const daily = 0.001;
    const annual = calculateAnnualRate(daily);
    expect(annual).toBeGreaterThan(daily);
  });

  it('calculateTEA calcula tasa efectiva anual', () => {
    const tea = calculateTEA(0.12);
    expect(tea).toBeGreaterThan(0.12);
  });

  it('calculateTNA calcula tasa nominal anual', () => {
    const tna = calculateTNA(0.01);
    expect(tna).toBe(0.12);
  });

  it('calculateCAGR calcula crecimiento anual compuesto', () => {
    const cagr = calculateCAGR(100000, 150000, 3);
    expect(cagr).toBeGreaterThan(0);
  });

  it('calculateAverage calcula promedio', () => {
    expect(calculateAverage([1, 2, 3, 4, 5])).toBe(3);
  });

  it('calculateMedian calcula mediana', () => {
    expect(calculateMedian([1, 2, 3, 4, 5])).toBe(3);
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
  });

  it('calculateVariance y calculateStandardDeviation', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const variance = calculateVariance(values);
    const std = calculateStandardDeviation(values);
    expect(variance).toBeGreaterThan(0);
    expect(std).toBe(Math.sqrt(variance));
  });

  it('calculateVolatility anualiza volatilidad diaria', () => {
    const returns = [0.01, -0.005, 0.008, 0.003, -0.002];
    const vol = calculateVolatility(returns);
    expect(vol).toBeGreaterThan(0);
  });

  it('futureValue calcula valor futuro', () => {
    const fv = futureValue(10000, 0.01, 12);
    expect(fv).toBeGreaterThan(10000);
  });

  it('compoundInterest calcula interés compuesto', () => {
    const interest = compoundInterest(10000, 0.01, 12);
    expect(interest).toBeGreaterThan(0);
  });

  it('calculateSharpeRatio calcula ratio de Sharpe', () => {
    const returns = [0.01, 0.02, -0.01, 0.015, 0.005];
    const sharpe = calculateSharpeRatio(returns);
    expect(typeof sharpe).toBe('number');
  });

  it('calculateSortinoRatio calcula ratio de Sortino', () => {
    const returns = [0.01, 0.02, -0.01, 0.015, 0.005];
    const sortino = calculateSortinoRatio(returns);
    expect(typeof sortino).toBe('number');
  });
});

describe('Finance - Drawdown', () => {
  it('calculateDrawdown encuentra el drawdown máximo', () => {
    const points = [
      { date: new Date('2024-01-01'), value: 100 },
      { date: new Date('2024-01-02'), value: 110 },
      { date: new Date('2024-01-03'), value: 95 },
      { date: new Date('2024-01-04'), value: 105 },
    ];
    const result = calculateDrawdown(points);
    expect(result.maxDrawdownPercent).toBeGreaterThan(0);
    expect(result.peakValue).toBe(110);
  });
});

describe('Finance - Simulation Engine', () => {
  it('runSimulation FIXED genera resultados', () => {
    const result = runSimulation({
      simulationType: SimulationType.FIXED,
      capitalInitial: 100000,
      monthlyContribution: 10000,
      annualRate: 0.1,
      years: 1,
    });
    expect(result.results.length).toBe(365);
    expect(result.finalCapital).toBeGreaterThan(result.capitalInitial);
  });

  it('runSimulation REAL_HISTORY usa historial', () => {
    const historicalReturns = Array.from({ length: 30 }, () => 0.001);
    const result = runSimulation({
      simulationType: SimulationType.REAL_HISTORY,
      capitalInitial: 50000,
      monthlyContribution: 0,
      years: 1,
      historicalReturns,
    });
    expect(result.results.length).toBe(365);
  });

  it('runSimulation OPTIMISTIC genera rendimientos positivos', () => {
    const result = runSimulation({
      simulationType: SimulationType.OPTIMISTIC,
      capitalInitial: 50000,
      monthlyContribution: 0,
      years: 1,
      optimisticMin: 0.001,
      optimisticMax: 0.003,
    });
    expect(result.finalCapital).toBeGreaterThanOrEqual(50000);
  });
});

describe('Finance - Statistics Engine', () => {
  it('calculateStatistics devuelve métricas completas', () => {
    const performances = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      dailyReturnPercent: (Math.random() - 0.3) * 2,
      dailyProfit: Math.random() * 100,
      shareValue: 100000 + i * 100,
    }));

    const movements = [
      { type: 'DEPOSIT' as const, amount: 100000, date: new Date('2024-01-01') },
      { type: 'DEPOSIT' as const, amount: 50000, date: new Date('2024-02-01') },
    ];

    const stats = calculateStatistics({ performances, movements });

    expect(stats).toHaveProperty('capitalActual');
    expect(stats).toHaveProperty('capitalInvertido');
    expect(stats).toHaveProperty('ganancia');
    expect(stats).toHaveProperty('rentabilidad');
    expect(stats).toHaveProperty('tea');
    expect(stats).toHaveProperty('tna');
    expect(stats).toHaveProperty('volatilidad');
    expect(stats).toHaveProperty('drawdown');
    expect(stats).toHaveProperty('cagr');
    expect(stats.capitalInvertido).toBe(150000);
  });
});
