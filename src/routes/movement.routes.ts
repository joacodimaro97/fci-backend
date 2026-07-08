import type { FastifyInstance } from 'fastify';
import * as movementController from '../controllers/movement.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function movementRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Movements'],
      description: 'Listar movimientos',
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
    handler: movementController.getAll,
  });

  fastify.post('/', {
    schema: {
      tags: ['Movements'],
      description: 'Crear un movimiento',
      security: [{ bearerAuth: [] }],
    },
    handler: movementController.create,
  });

  fastify.put('/:id', {
    schema: {
      tags: ['Movements'],
      description: 'Actualizar un movimiento',
      security: [{ bearerAuth: [] }],
    },
    handler: movementController.update,
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Movements'],
      description: 'Eliminar un movimiento',
      security: [{ bearerAuth: [] }],
    },
    handler: movementController.remove,
  });
}
