import type { FastifyInstance } from 'fastify';
import * as cashSummaryController from '../controllers/cashSummary.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function cashSummaryRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Cash Summary'],
      description: 'Resumen de ingresos, gastos y balance',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          cashAccountId: { type: 'string' },
          year: { type: 'integer' },
          month: { type: 'integer' },
        },
      },
    },
    handler: cashSummaryController.getSummary,
  });
}
