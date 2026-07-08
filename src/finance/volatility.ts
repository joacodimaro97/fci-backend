import { calculateStandardDeviation } from './rates.js';

export interface VolatilityMetrics {
  dailyVolatility: number;
  annualizedVolatility: number;
  rollingVolatility30d: number;
}

/**
 * Calcula métricas de volatilidad a partir de rendimientos diarios.
 */
export function calculateVolatilityMetrics(dailyReturns: number[]): VolatilityMetrics {
  const dailyVolatility = calculateStandardDeviation(dailyReturns);
  const annualizedVolatility = dailyVolatility * Math.sqrt(252);

  const last30 = dailyReturns.slice(-30);
  const rollingVolatility30d =
    last30.length >= 2 ? calculateStandardDeviation(last30) * Math.sqrt(252) : 0;

  return {
    dailyVolatility,
    annualizedVolatility,
    rollingVolatility30d,
  };
}

/**
 * Genera un rendimiento aleatorio con distribución normal (Box-Muller).
 */
export function generateNormalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

/**
 * Genera rendimientos optimistas (siempre positivos, entre min y max).
 */
export function generateOptimisticReturn(minRate: number, maxRate: number): number {
  return minRate + Math.random() * (maxRate - minRate);
}

/**
 * Genera rendimientos pesimistas (pueden ser negativos).
 */
export function generatePessimisticReturn(minRate: number, maxRate: number): number {
  return minRate + Math.random() * (maxRate - minRate);
}

/**
 * Genera rendimientos custom con probabilidad de pérdidas.
 */
export function generateCustomReturn(
  mean: number,
  stdDev: number,
  lossProbability: number,
): number {
  if (Math.random() < lossProbability) {
    return -Math.abs(generateNormalRandom(mean, stdDev));
  }
  return generateNormalRandom(mean, stdDev);
}
