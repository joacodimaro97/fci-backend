import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/auth.middleware.js';
import jwtPlugin from './plugins/jwt.plugin.js';
import requestLoggerPlugin from './plugins/requestLogger.plugin.js';
import swaggerPlugin from './plugins/swagger.plugin.js';
import { registerRoutes } from './routes/index.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.logLevel,
      transport: env.isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          },
    },
  });

  app.setErrorHandler(errorHandler);

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(swaggerPlugin);
  await app.register(jwtPlugin);
  await app.register(requestLoggerPlugin);
  await app.register(registerRoutes);

  return app;
}
