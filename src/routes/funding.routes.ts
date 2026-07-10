import type { FastifyInstance } from 'fastify';
import * as fundingController from '../controllers/funding.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function fundingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Account Fundings'],
      description:
        'Listar movimientos entre efectivo y cuentas de inversión (depósitos y retiros vinculados)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          cashAccountId: { type: 'string' },
          investmentAccountId: { type: 'string' },
          type: { type: 'string', enum: ['CASH_TO_INVESTMENT', 'INVESTMENT_TO_CASH'] },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
    handler: fundingController.getAll,
  });

  fastify.post('/', {
    schema: {
      tags: ['Account Fundings'],
      description:
        'Registrar depósito efectivo→inversión o retiro inversión→efectivo (operación atómica)',
      security: [{ bearerAuth: [] }],
    },
    handler: fundingController.create,
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Account Fundings'],
      description: 'Eliminar movimiento vinculado y sus registros en cash e inversión',
      security: [{ bearerAuth: [] }],
    },
    handler: fundingController.remove,
  });
}
