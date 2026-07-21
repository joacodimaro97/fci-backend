import { env } from './config/env.js';
import { buildApp } from './app.js';
import { startTelegramBot, stopTelegramBot } from './telegram/bot.js';

async function start(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info(`Servidor corriendo en http://${env.host}:${env.port}`);
    app.log.info(`Documentación Swagger en http://${env.host}:${env.port}/docs`);

    await startTelegramBot(app.log);

    const shutdown = async (signal: string): Promise<void> => {
      app.log.info(`Señal ${signal} recibida, cerrando...`);
      await stopTelegramBot();
      await app.close();
      process.exit(0);
    };

    process.once('SIGINT', () => {
      void shutdown('SIGINT');
    });
    process.once('SIGTERM', () => {
      void shutdown('SIGTERM');
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
