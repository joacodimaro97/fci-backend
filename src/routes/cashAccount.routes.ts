import type { FastifyInstance } from 'fastify';
import * as cashAccountController from '../controllers/cashAccount.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function cashAccountRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Cash Accounts'],
      description: 'Listar cuentas de efectivo',
      security: [{ bearerAuth: [] }],
    },
    handler: cashAccountController.getAll,
  });

  fastify.post('/', {
    schema: {
      tags: ['Cash Accounts'],
      description: 'Crear cuenta de efectivo',
      security: [{ bearerAuth: [] }],
    },
    handler: cashAccountController.create,
  });

  fastify.put('/:id', {
    schema: {
      tags: ['Cash Accounts'],
      description: 'Actualizar cuenta de efectivo',
      security: [{ bearerAuth: [] }],
    },
    handler: cashAccountController.update,
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Cash Accounts'],
      description: 'Eliminar cuenta de efectivo',
      security: [{ bearerAuth: [] }],
    },
    handler: cashAccountController.remove,
  });
}
