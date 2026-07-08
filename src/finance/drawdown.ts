import { calculateAverage } from './rates.js';

export interface DrawdownResult {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  peakValue: number;
  troughValue: number;
  peakDate?: Date;
  troughDate?: Date;
}

export interface DrawdownPoint {
  date: Date;
  value: number;
}

/**
 * Calcula el drawdown máximo a partir de una serie de valores.
 */
export function calculateDrawdown(points: DrawdownPoint[]): DrawdownResult {
  if (points.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      peakValue: 0,
      troughValue: 0,
    };
  }

  let peak = points[0]!.value;
  let peakDate = points[0]!.date;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let troughValue = peak;
  let resultPeak = peak;
  let resultTrough = peak;
  let resultPeakDate = peakDate;
  let resultTroughDate = peakDate;

  for (const point of points) {
    if (point.value > peak) {
      peak = point.value;
      peakDate = point.date;
    }

    const drawdown = peak - point.value;
    const drawdownPercent = peak > 0 ? drawdown / peak : 0;

    if (drawdownPercent > maxDrawdownPercent) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
      troughValue = point.value;
      resultPeak = peak;
      resultTrough = troughValue;
      resultPeakDate = peakDate;
      resultTroughDate = point.date;
    }
  }

  return {
    maxDrawdown,
    maxDrawdownPercent,
    peakValue: resultPeak,
    troughValue: resultTrough,
    peakDate: resultPeakDate,
    troughDate: resultTroughDate,
  };
}

/**
 * Calcula la volatilidad rolling (ventana móvil).
 */
export function calculateRollingVolatility(
  dailyReturns: number[],
  windowSize = 30,
): number[] {
  const result: number[] = [];
  for (let i = windowSize - 1; i < dailyReturns.length; i++) {
    const window = dailyReturns.slice(i - windowSize + 1, i + 1);
    const mean = calculateAverage(window);
    const variance =
      window.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (window.length - 1);
    result.push(Math.sqrt(variance) * Math.sqrt(252));
  }
  return result;
}
