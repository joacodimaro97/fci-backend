import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes.js';
import { accountRoutes } from './account.routes.js';
import { movementRoutes } from './movement.routes.js';
import { performanceRoutes } from './performance.routes.js';
import { simulationRoutes } from './simulation.routes.js';
import { statisticsRoutes } from './statistics.routes.js';
import { cashAccountRoutes } from './cashAccount.routes.js';
import { categoryRoutes } from './category.routes.js';
import { transactionRoutes } from './transaction.routes.js';
import { cashSummaryRoutes } from './cashSummary.routes.js';
import { transferRoutes } from './transfer.routes.js';
import { fundingRoutes } from './funding.routes.js';
import { budgetRoutes } from './budget.routes.js';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(accountRoutes, { prefix: '/accounts' });
  await fastify.register(movementRoutes, { prefix: '/movements' });
  await fastify.register(performanceRoutes, { prefix: '/performance' });
  await fastify.register(simulationRoutes, { prefix: '/simulation' });
  await fastify.register(statisticsRoutes, { prefix: '/statistics' });

  await fastify.register(cashAccountRoutes, { prefix: '/cash/accounts' });
  await fastify.register(categoryRoutes, { prefix: '/cash/categories' });
  await fastify.register(transactionRoutes, { prefix: '/cash/transactions' });
  await fastify.register(cashSummaryRoutes, { prefix: '/cash/summary' });
  await fastify.register(transferRoutes, { prefix: '/cash/transfers' });
  await fastify.register(fundingRoutes, { prefix: '/fundings' });
  await fastify.register(budgetRoutes, { prefix: '/cash/budgets' });

  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      description: 'Health check',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      reply.send({ status: 'ok', timestamp: new Date().toISOString() });
    },
  });
}
