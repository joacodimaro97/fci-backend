import type {
  CreateSimulationData,
  CreateSimulationResultData,
  SimulationEntity,
  SimulationWithResults,
} from '../models/index.js';

export interface ISimulationRepository {
  create(data: CreateSimulationData, results: CreateSimulationResultData[]): Promise<SimulationWithResults>;
  findById(id: string): Promise<SimulationEntity | null>;
  findByIdWithResults(id: string): Promise<SimulationWithResults | null>;
  findByAccountIds(accountIds: string[]): Promise<SimulationEntity[]>;
  findByIdAndAccountIds(id: string, accountIds: string[]): Promise<SimulationWithResults | null>;
  delete(id: string): Promise<void>;
}
