import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function requestLoggerPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onResponse', (request, reply, done) => {
    const duration = reply.elapsedTime;
    const userId = (request.user as { sub?: string } | undefined)?.sub ?? 'anonymous';

    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration: `${duration.toFixed(2)}ms`,
        userId,
      },
      'request completed',
    );
    done();
  });
}

export default fp(requestLoggerPlugin, {
  name: 'request-logger',
});
