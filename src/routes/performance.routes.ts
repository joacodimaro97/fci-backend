import type { FastifyInstance } from 'fastify';
import * as performanceController from '../controllers/performance.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function performanceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Performance'],
      description: 'Listar rendimientos diarios',
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
    handler: performanceController.getAll,
  });

  fastify.post('/', {
    schema: {
      tags: ['Performance'],
      description: 'Registrar o actualizar rendimiento diario (upsert por cuenta y fecha)',
      security: [{ bearerAuth: [] }],
    },
    handler: performanceController.create,
  });

  fastify.put('/:id', {
    schema: {
      tags: ['Performance'],
      description: 'Actualizar rendimiento diario',
      security: [{ bearerAuth: [] }],
    },
    handler: performanceController.update,
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Performance'],
      description: 'Eliminar rendimiento diario',
      security: [{ bearerAuth: [] }],
    },
    handler: performanceController.remove,
  });

  fastify.get('/monthly', {
    schema: {
      tags: ['Performance'],
      description: 'Obtener rendimientos mensuales agregados',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          accountId: { type: 'string' },
          year: { type: 'integer' },
        },
      },
    },
    handler: performanceController.getMonthly,
  });

  fastify.get('/yearly', {
    schema: {
      tags: ['Performance'],
      description: 'Obtener rendimientos anuales agregados',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          accountId: { type: 'string' },
        },
      },
    },
    handler: performanceController.getYearly,
  });
}
