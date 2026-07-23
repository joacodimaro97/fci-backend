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

  fastify.get('/intents', {
    schema: {
      tags: ['Cash Summary'],
      description:
        'Reporte de gastos por intención (NECESIDAD, GUSTO, IMPULSO, CONVENIENCIA). ' +
        'Filtros: year/month o startDate+endDate (YYYY-MM-DD). Totales netos descuentan reintegros.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          cashAccountId: { type: 'string' },
          year: { type: 'integer' },
          month: { type: 'integer' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
    handler: cashSummaryController.getIntentReport,
  });
}
