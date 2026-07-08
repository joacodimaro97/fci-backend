import type { FastifyInstance } from 'fastify';
import * as statisticsController from '../controllers/statistics.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function statisticsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Statistics'],
      description: 'Obtener estadísticas financieras completas',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          accountId: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
    handler: statisticsController.getStatistics,
  });
}
