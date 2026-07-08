import type { FastifyInstance } from 'fastify';
import * as accountController from '../controllers/account.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function accountRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Accounts'],
      description: 'Listar cuentas del usuario',
      security: [{ bearerAuth: [] }],
    },
    handler: accountController.getAll,
  });

  fastify.post('/', {
    schema: {
      tags: ['Accounts'],
      description: 'Crear una cuenta de inversión',
      security: [{ bearerAuth: [] }],
    },
    handler: accountController.create,
  });

  fastify.put('/:id', {
    schema: {
      tags: ['Accounts'],
      description: 'Actualizar una cuenta',
      security: [{ bearerAuth: [] }],
    },
    handler: accountController.update,
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Accounts'],
      description: 'Eliminar una cuenta',
      security: [{ bearerAuth: [] }],
    },
    handler: accountController.remove,
  });
}
