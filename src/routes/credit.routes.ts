import type { FastifyInstance } from 'fastify';
import * as creditController from '../controllers/credit.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function creditRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Credits'],
      description: 'Listar créditos (debo / me deben)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['OWED_BY_ME', 'OWED_TO_ME'] },
          status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
          currency: { type: 'string' },
        },
      },
    },
    handler: creditController.getAll,
  });

  fastify.get('/summary', {
    schema: {
      tags: ['Credits'],
      description: 'Resumen: totales debo/me deben, vencidos y próximos vencimientos',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          upcomingLimit: { type: 'string' },
        },
      },
    },
    handler: creditController.getSummary,
  });

  fastify.get('/calendar', {
    schema: {
      tags: ['Credits'],
      description: 'Agenda de cuotas por rango de fechas de vencimiento',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          direction: { type: 'string', enum: ['OWED_BY_ME', 'OWED_TO_ME'] },
          status: { type: 'string', enum: ['PENDING', 'PAID'] },
        },
      },
    },
    handler: creditController.getCalendar,
  });

  fastify.post('/', {
    schema: {
      tags: ['Credits'],
      description: 'Crear crédito con calendario de cuotas fijas',
      security: [{ bearerAuth: [] }],
    },
    handler: creditController.create,
  });

  fastify.get('/:id', {
    schema: {
      tags: ['Credits'],
      description: 'Detalle de crédito con cuotas y totales',
      security: [{ bearerAuth: [] }],
    },
    handler: creditController.getById,
  });

  fastify.patch('/:id', {
    schema: {
      tags: ['Credits'],
      description: 'Actualizar metadata del crédito',
      security: [{ bearerAuth: [] }],
    },
    handler: creditController.update,
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Credits'],
      description:
        'Eliminar crédito sin pagos, o cancelarlo (CANCELLED) si ya tiene cuotas pagadas',
      security: [{ bearerAuth: [] }],
    },
    handler: creditController.remove,
  });

  fastify.patch('/:id/installments/:installmentId', {
    schema: {
      tags: ['Credits'],
      description: 'Reprogramar dueDate de una cuota pendiente',
      security: [{ bearerAuth: [] }],
    },
    handler: creditController.updateInstallment,
  });

  fastify.post('/:id/installments/:installmentId/pay', {
    schema: {
      tags: ['Credits'],
      description: 'Registrar pago/cobro de cuota (crea Transaction en cash)',
      security: [{ bearerAuth: [] }],
    },
    handler: creditController.payInstallment,
  });

  fastify.delete('/:id/installments/:installmentId/payment', {
    schema: {
      tags: ['Credits'],
      description: 'Deshacer pago/cobro de cuota',
      security: [{ bearerAuth: [] }],
    },
    handler: creditController.unpayInstallment,
  });
}
