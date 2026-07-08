export {
  calculateDailyRate,
  calculateMonthlyRate,
  calculateAnnualRate,
  calculateTEA,
  calculateTNA,
  calculateCAGR,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateAverage,
  calculateMedian,
  calculateVariance,
  calculateStandardDeviation,
  calculateVolatility,
  futureValue,
  compoundInterest,
} from './rates.js';

export { calculateDrawdown, calculateRollingVolatility } from './drawdown.js';
export {
  calculateVolatilityMetrics,
  generateNormalRandom,
  generateOptimisticReturn,
  generatePessimisticReturn,
  generateCustomReturn,
} from './volatility.js';
export { projectFixedRate, projectRealHistory } from './projection.js';
export { runSimulation } from './simulationEngine.js';
