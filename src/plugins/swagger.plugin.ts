import type { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';

async function swaggerPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'FCI Backend API',
        description: 'API REST para seguimiento y simulación de inversiones personales',
        version: '1.0.0',
      },
      servers: [{ url: '/', description: 'API' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Autenticación y registro' },
        { name: 'Accounts', description: 'Gestión de cuentas de inversión' },
        { name: 'Movements', description: 'Depósitos y retiros' },
        { name: 'Performance', description: 'Rendimientos diarios' },
        { name: 'Simulation', description: 'Simulaciones de inversión' },
        { name: 'Statistics', description: 'Estadísticas financieras' },
        { name: 'Cash Accounts', description: 'Cuentas de efectivo' },
        { name: 'Cash Categories', description: 'Categorías de ingresos y gastos' },
        { name: 'Cash Transactions', description: 'Ingresos y gastos' },
        { name: 'Cash Summary', description: 'Resumen de flujo de caja' },
        { name: 'Cash Transfers', description: 'Transferencias entre cuentas de efectivo' },
        { name: 'Account Fundings', description: 'Movimientos entre efectivo y cuentas de inversión' },
      ],
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}

export default fp(swaggerPlugin, {
  name: 'swagger',
});
