import type { FastifyReply, FastifyRequest } from 'fastify';
import { statisticsService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import { statisticsQuerySchema } from '../validators/statistics.validator.js';

export async function getStatistics(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(statisticsQuerySchema, request.query);
  const statistics = await statisticsService.getStatistics(request.user.sub, query);
  reply.send(statistics);
}
