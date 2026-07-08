/**
 * Convierte una tasa anual a tasa diaria (interés compuesto).
 */
export function calculateDailyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 365) - 1;
}

/**
 * Convierte una tasa anual a tasa mensual (interés compuesto).
 */
export function calculateMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

/**
 * Convierte una tasa diaria a tasa anual (interés compuesto).
 */
export function calculateAnnualRate(dailyRate: number): number {
  return Math.pow(1 + dailyRate, 365) - 1;
}

/**
 * Tasa Efectiva Anual (TEA).
 * TEA = (1 + tasa_nominal/n)^n - 1
 */
export function calculateTEA(nominalRate: number, periodsPerYear = 12): number {
  return Math.pow(1 + nominalRate / periodsPerYear, periodsPerYear) - 1;
}

/**
 * Tasa Nominal Anual (TNA).
 * TNA = tasa_efectiva * periodos
 */
export function calculateTNA(effectiveRate: number, periodsPerYear = 12): number {
  return effectiveRate * periodsPerYear;
}

/**
 * Compound Annual Growth Rate (CAGR).
 * CAGR = (valor_final / valor_inicial)^(1/años) - 1
 */
export function calculateCAGR(initialValue: number, finalValue: number, years: number): number {
  if (initialValue <= 0 || years <= 0) {
    return 0;
  }
  return Math.pow(finalValue / initialValue, 1 / years) - 1;
}

/**
 * Calcula el promedio aritmético de un array de valores.
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calcula la mediana de un array de valores.
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * Calcula la varianza muestral de un array de valores.
 */
export function calculateVariance(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const mean = calculateAverage(values);
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1);
}

/**
 * Calcula la desviación estándar muestral.
 */
export function calculateStandardDeviation(values: number[]): number {
  return Math.sqrt(calculateVariance(values));
}

/**
 * Calcula la volatilidad anualizada a partir de rendimientos diarios.
 */
export function calculateVolatility(dailyReturns: number[]): number {
  const dailyStd = calculateStandardDeviation(dailyReturns);
  return dailyStd * Math.sqrt(252);
}

/**
 * Calcula el valor futuro con interés compuesto.
 */
export function futureValue(
  principal: number,
  rate: number,
  periods: number,
  payment = 0,
): number {
  if (rate === 0) {
    return principal + payment * periods;
  }
  const compoundFactor = Math.pow(1 + rate, periods);
  const futurePrincipal = principal * compoundFactor;
  const futurePayments = payment * ((compoundFactor - 1) / rate);
  return futurePrincipal + futurePayments;
}

/**
 * Calcula el interés compuesto.
 */
export function compoundInterest(
  principal: number,
  rate: number,
  periods: number,
): number {
  return principal * Math.pow(1 + rate, periods) - principal;
}

/**
 * Calcula el ratio de Sharpe.
 * Sharpe = (retorno_promedio - tasa_libre_riesgo) / desviación_estándar
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate = 0,
): number {
  const std = calculateStandardDeviation(returns);
  if (std === 0) {
    return 0;
  }
  const avgReturn = calculateAverage(returns);
  return (avgReturn - riskFreeRate) / std;
}

/**
 * Calcula el ratio de Sortino (solo penaliza volatilidad negativa).
 */
export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate = 0,
): number {
  const avgReturn = calculateAverage(returns);
  const negativeReturns = returns.filter((r) => r < 0);
  if (negativeReturns.length === 0) {
    return avgReturn > riskFreeRate ? Infinity : 0;
  }
  const downsideDeviation = Math.sqrt(
    negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length,
  );
  if (downsideDeviation === 0) {
    return 0;
  }
  return (avgReturn - riskFreeRate) / downsideDeviation;
}
