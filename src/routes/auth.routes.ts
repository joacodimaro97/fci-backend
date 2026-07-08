import type { FastifyInstance } from 'fastify';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      description: 'Registrar un nuevo usuario',
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            user: { type: 'object' },
            token: { type: 'string' },
          },
        },
      },
    },
    handler: authController.register,
  });

  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      description: 'Iniciar sesión',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
    handler: authController.login,
  });

  fastify.get('/me', {
    schema: {
      tags: ['Auth'],
      description: 'Obtener usuario autenticado',
      security: [{ bearerAuth: [] }],
    },
    preHandler: [authenticate],
    handler: authController.getMe,
  });
}
