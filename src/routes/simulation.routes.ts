import type { FastifyInstance } from 'fastify';
import * as simulationController from '../controllers/simulation.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function simulationRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.post('/', {
    schema: {
      tags: ['Simulation'],
      description: 'Ejecutar simulación sin guardar',
      security: [{ bearerAuth: [] }],
    },
    handler: simulationController.run,
  });

  fastify.post('/save', {
    schema: {
      tags: ['Simulation'],
      description: 'Ejecutar y guardar simulación',
      security: [{ bearerAuth: [] }],
    },
    handler: simulationController.save,
  });

  fastify.get('/', {
    schema: {
      tags: ['Simulation'],
      description: 'Listar simulaciones guardadas',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          accountId: { type: 'string' },
        },
      },
    },
    handler: simulationController.getAll,
  });

  fastify.get('/:id', {
    schema: {
      tags: ['Simulation'],
      description: 'Obtener simulación por ID',
      security: [{ bearerAuth: [] }],
    },
    handler: simulationController.getById,
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Simulation'],
      description: 'Eliminar simulación',
      security: [{ bearerAuth: [] }],
    },
    handler: simulationController.remove,
  });
}
