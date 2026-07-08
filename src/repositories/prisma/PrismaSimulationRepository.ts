import type { PrismaClient } from '@prisma/client';
import type {
  CreateSimulationData,
  CreateSimulationResultData,
  SimulationEntity,
  SimulationWithResults,
} from '../../models/index.js';
import type { ISimulationRepository } from '../ISimulationRepository.js';

export class PrismaSimulationRepository implements ISimulationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: CreateSimulationData,
    results: CreateSimulationResultData[],
  ): Promise<SimulationWithResults> {
    return this.prisma.simulation.create({
      data: {
        accountId: data.accountId,
        name: data.name,
        simulationType: data.simulationType,
        capitalInitial: data.capitalInitial,
        monthlyContribution: data.monthlyContribution ?? 0,
        annualRate: data.annualRate,
        years: data.years,
        results: {
          create: results,
        },
      },
      include: { results: { orderBy: { day: 'asc' } } },
    });
  }

  async findById(id: string): Promise<SimulationEntity | null> {
    return this.prisma.simulation.findUnique({ where: { id } });
  }

  async findByIdWithResults(id: string): Promise<SimulationWithResults | null> {
    return this.prisma.simulation.findUnique({
      where: { id },
      include: { results: { orderBy: { day: 'asc' } } },
    });
  }

  async findByAccountIds(accountIds: string[]): Promise<SimulationEntity[]> {
    return this.prisma.simulation.findMany({
      where: { accountId: { in: accountIds } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdAndAccountIds(
    id: string,
    accountIds: string[],
  ): Promise<SimulationWithResults | null> {
    return this.prisma.simulation.findFirst({
      where: { id, accountId: { in: accountIds } },
      include: { results: { orderBy: { day: 'asc' } } },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.simulation.delete({ where: { id } });
  }
}
