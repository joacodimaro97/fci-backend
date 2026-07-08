import type { FastifyInstance } from 'fastify';
import * as categoryController from '../controllers/category.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function categoryRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Cash Categories'],
      description: 'Listar categorías de ingresos/gastos',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
          parentId: { type: 'string' },
          rootsOnly: { type: 'boolean' },
          tree: { type: 'boolean' },
        },
      },
    },
    handler: categoryController.getAll,
  });

  fastify.post('/', {
    schema: {
      tags: ['Cash Categories'],
      description: 'Crear categoría',
      security: [{ bearerAuth: [] }],
    },
    handler: categoryController.create,
  });

  fastify.put('/:id', {
    schema: {
      tags: ['Cash Categories'],
      description: 'Actualizar categoría',
      security: [{ bearerAuth: [] }],
    },
    handler: categoryController.update,
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Cash Categories'],
      description: 'Eliminar categoría',
      security: [{ bearerAuth: [] }],
    },
    handler: categoryController.remove,
  });
}
