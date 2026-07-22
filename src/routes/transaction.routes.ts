import type { FastifyInstance } from 'fastify';
import * as transactionController from '../controllers/transaction.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function transactionRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Cash Transactions'],
      description:
        'Listar transacciones con stats del set filtrado ({ items, stats }). ' +
        'categoryIds (repetible) filtra IN exacto sin expandir; tiene prioridad sobre categoryId. ' +
        'Si solo viene categoryId y es padre, incluye hijas. ' +
        'stats.totalDays usa startDate/endDate del query (inclusive); ' +
        'si falta alguno se completa con min/max fecha de los items; ' +
        'sin fechas ni items → totalDays 0 y fechas null. ' +
        'stats.byWeek (lun–dom UTC) solo si hay startDate y endDate; parciales con partial/dayCount; ' +
        'sin ambas fechas → byWeek [] y highest/lowest null.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          cashAccountId: { type: 'string' },
          categoryId: { type: 'string' },
          categoryIds: {
            anyOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } },
            ],
          },
          type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
          intent: {
            type: 'string',
            enum: ['NECESIDAD', 'CUIDADO', 'GUSTO', 'IMPULSO', 'REVISAR'],
          },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          excludeTransfers: { type: 'string', enum: ['true', 'false'] },
          excludeFundings: { type: 'string', enum: ['true', 'false'] },
          excludeInstallments: { type: 'string', enum: ['true', 'false'] },
        },
      },
    },
    handler: transactionController.getAll,
  });

  fastify.post('/', {
    schema: {
      tags: ['Cash Transactions'],
      description:
        'Crear transacción. En gastos, intent es opcional (default REVISAR). En ingresos se ignora.',
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
