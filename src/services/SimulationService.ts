import { NotFoundError } from '../errors/AppError.js';
import { runSimulation } from '../finance/simulationEngine.js';
import type { SimulationEntity, SimulationWithResults } from '../models/index.js';
import type { IAccountRepository } from '../repositories/IAccountRepository.js';
import type { IPerformanceRepository } from '../repositories/IPerformanceRepository.js';
import type { ISimulationRepository } from '../repositories/ISimulationRepository.js';
import { SimulationType } from '../types/enums.js';
import type {
  RunSimulationInput,
  SaveSimulationInput,
  SimulationQueryInput,
} from '../validators/simulation.validator.js';

export class SimulationService {
  constructor(
    private readonly simulationRepository: ISimulationRepository,
    private readonly accountRepository: IAccountRepository,
    private readonly performanceRepository: IPerformanceRepository,
  ) {}

  async run(userId: string, input: RunSimulationInput) {
    await this.verifyAccountOwnership(userId, input.accountId);

    const historicalReturns =
      input.simulationType === SimulationType.REAL_HISTORY
        ? await this.getHistoricalReturns(input.accountId)
        : undefined;

    return runSimulation({
      simulationType: input.simulationType,
      capitalInitial: input.capitalInitial,
      monthlyContribution: input.monthlyContribution ?? 0,
      annualRate: input.annualRate,
      years: input.years,
      historicalReturns,
      optimisticMin: input.optimisticMin,
      optimisticMax: input.optimisticMax,
      pessimisticMin: input.pessimisticMin,
      pessimisticMax: input.pessimisticMax,
      customMean: input.customMean,
      customStdDev: input.customStdDev,
      customLossProbability: input.customLossProbability,
    });
  }

  async save(userId: string, input: SaveSimulationInput): Promise<SimulationWithResults> {
    await this.verifyAccountOwnership(userId, input.accountId);

    const historicalReturns =
      input.simulationType === SimulationType.REAL_HISTORY
        ? await this.getHistoricalReturns(input.accountId)
        : undefined;

    const output = runSimulation({
      simulationType: input.simulationType,
      capitalInitial: input.capitalInitial,
      monthlyContribution: input.monthlyContribution ?? 0,
      annualRate: input.annualRate,
      years: input.years,
      historicalReturns,
      optimisticMin: input.optimisticMin,
      optimisticMax: input.optimisticMax,
      pessimisticMin: input.pessimisticMin,
      pessimisticMax: input.pessimisticMax,
      customMean: input.customMean,
      customStdDev: input.customStdDev,
      customLossProbability: input.customLossProbability,
    });

    return this.simulationRepository.create(
      {
        accountId: input.accountId,
        name: input.name,
        simulationType: input.simulationType,
        capitalInitial: input.capitalInitial,
        monthlyContribution: input.monthlyContribution ?? 0,
        annualRate: input.annualRate,
        years: input.years,
      },
      output.results.map((r) => ({
        day: r.day,
        capital: r.capital,
        profit: r.profit,
        dailyRate: r.dailyRate,
      })),
    );
  }

  async getAll(userId: string, query: SimulationQueryInput): Promise<SimulationEntity[]> {
    const accountIds = await this.getFilteredAccountIds(userId, query.accountId);
    return this.simulationRepository.findByAccountIds(accountIds);
  }

  async getById(userId: string, simulationId: string): Promise<SimulationWithResults> {
    const accountIds = await this.getUserAccountIds(userId);
    const simulation = await this.simulationRepository.findByIdAndAccountIds(
      simulationId,
      accountIds,
    );
    if (!simulation) {
      throw new NotFoundError('Simulación');
    }
    return simulation;
  }

  async delete(userId: string, simulationId: string): Promise<void> {
    const accountIds = await this.getUserAccountIds(userId);
    const simulation = await this.simulationRepository.findByIdAndAccountIds(
      simulationId,
      accountIds,
    );
    if (!simulation) {
      throw new NotFoundError('Simulación');
    }
    await this.simulationRepository.delete(simulationId);
  }

  private async getHistoricalReturns(accountId: string): Promise<number[]> {
    const performances = await this.performanceRepository.findByFilters({ accountId });
    return performances.map((p) => p.dailyReturnPercent / 100);
  }

  private async getUserAccountIds(userId: string): Promise<string[]> {
    const accounts = await this.accountRepository.findByUserId(userId);
    return accounts.map((a) => a.id);
  }

  private async getFilteredAccountIds(userId: string, accountId?: string): Promise<string[]> {
    if (accountId) {
      await this.verifyAccountOwnership(userId, accountId);
      return [accountId];
    }
    return this.getUserAccountIds(userId);
  }

  private async verifyAccountOwnership(userId: string, accountId: string): Promise<void> {
    const account = await this.accountRepository.findByIdAndUserId(accountId, userId);
    if (!account) {
      throw new NotFoundError('Cuenta');
    }
  }
}
