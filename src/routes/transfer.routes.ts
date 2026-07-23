import type { FastifyInstance } from 'fastify';
import * as transferController from '../controllers/transfer.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function transferRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Cash Transfers'],
      description: 'Listar transferencias entre cuentas de efectivo',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          cashAccountId: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
    handler: transferController.getAll,
  });

  fastify.post('/', {
    schema: {
      tags: ['Cash Transfers'],
      description:
        'Crear transferencia entre cuentas (genera egreso + ingreso vinculados). ' +
        'Misma moneda: solo amount. Multi-moneda: amount + exchangeRate (destino por 1 origen) ' +
        'o amount + toAmount.',
      security: [{ bearerAuth: [] }],
    },
    handler: transferController.create,
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Cash Transfers'],
      description: 'Eliminar transferencia y sus transacciones vinculadas',
      security: [{ bearerAuth: [] }],
    },
    handler: transferController.remove,
  });
}
