import type { FastifyInstance } from 'fastify';
import * as budgetController from '../controllers/budget.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function budgetRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Budgets'],
      description:
        'Listar presupuestos con análisis (gasto diario sugerido y cumplimiento). No afecta saldos.',
      security: [{ bearerAuth: [] }],
    },
    handler: budgetController.getAll,
  });

  fastify.get('/:id', {
    schema: {
      tags: ['Budgets'],
      description: 'Obtener un presupuesto con su análisis actualizado',
      security: [{ bearerAuth: [] }],
    },
    handler: budgetController.getById,
  });

  fastify.post('/', {
    schema: {
      tags: ['Budgets'],
      description:
        'Crear presupuesto. Puede ser por cuenta (saldo hasta una fecha) y/o por categoría(s) con monto fijo. Si categoryIds viene, amount es obligatorio. Si se elige una categoría padre, también cuenta gastos de sus hijos.',
      security: [{ bearerAuth: [] }],
    },
    handler: budgetController.create,
  });

  fastify.put('/:id', {
    schema: {
      tags: ['Budgets'],
      description: 'Actualizar presupuesto',
      security: [{ bearerAuth: [] }],
    },
    handler: budgetController.update,
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Budgets'],
      description: 'Eliminar presupuesto',
      security: [{ bearerAuth: [] }],
    },
    handler: budgetController.remove,
  });
}
