import type { FastifyInstance } from 'fastify';
import * as telegramController from '../controllers/telegram.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function telegramRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/link', {
    schema: {
      tags: ['Telegram'],
      description: 'Generar deep link para vincular Telegram',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            deepLink: { type: 'string' },
            expiresAt: { type: 'string' },
          },
        },
      },
    },
    preHandler: [authenticate],
    handler: telegramController.createLink,
  });

  fastify.delete('/link', {
    schema: {
      tags: ['Telegram'],
      description: 'Desvincular Telegram de la cuenta',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            telegramLinked: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
    preHandler: [authenticate],
    handler: telegramController.unlink,
  });

  fastify.get('/status', {
    schema: {
      tags: ['Telegram'],
      description: 'Estado de vinculación con Telegram',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            linked: { type: 'boolean' },
          },
        },
      },
    },
    preHandler: [authenticate],
    handler: telegramController.getStatus,
  });
}
