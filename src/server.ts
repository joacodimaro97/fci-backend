import { env } from './config/env.js';
import { buildApp } from './app.js';

async function start(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info(`Servidor corriendo en http://${env.host}:${env.port}`);
    app.log.info(`Documentación Swagger en http://${env.host}:${env.port}/docs`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
