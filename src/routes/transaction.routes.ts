import type { FastifyInstance } from 'fastify';
import * as transactionController from '../controllers/transaction.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function transactionRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Cash Transactions'],
      description: 'Listar transacciones de ingresos/gastos',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          cashAccountId: { type: 'string' },
          categoryId: { type: 'string' },
          type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          excludeTransfers: { type: 'string', enum: ['true', 'false'] },
          excludeFundings: { type: 'string', enum: ['true', 'false'] },
        },
      },
    },
    handler: transactionController.getAll,
  });

  fastify.post('/', {
    schema: {
      tags: ['Cash Transactions'],
      description: 'Crear transacción',
      security: [{ bearerAuth: [] }],
    },
    handler: transactionController.create,
  });

  fastify.put('/:id', {
    schema: {
      tags: ['Cash Transactions'],
      description: 'Actualizar transacción',
      security: [{ bearerAuth: [] }],
    },
    handler: transactionController.update,
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Cash Transactions'],
      description: 'Eliminar transacción',
      security: [{ bearerAuth: [] }],
    },
    handler: transactionController.remove,
  });
}
