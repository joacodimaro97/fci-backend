import type { FastifyReply, FastifyRequest } from 'fastify';
import { cashSummaryService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import { cashSummaryQuerySchema } from '../validators/cashSummary.validator.js';

export async function getSummary(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(cashSummaryQuerySchema, request.query);
  const summary = await cashSummaryService.getSummary(request.user.sub, query);
  reply.send(summary);
}
