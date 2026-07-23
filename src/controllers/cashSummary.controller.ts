import type { FastifyReply, FastifyRequest } from 'fastify';
import { cashSummaryService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  cashSummaryQuerySchema,
  intentReportQuerySchema,
} from '../validators/cashSummary.validator.js';

export async function getSummary(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(cashSummaryQuerySchema, request.query);
  const summary = await cashSummaryService.getSummary(request.user.sub, query);
  reply.send(summary);
}

export async function getIntentReport(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(intentReportQuerySchema, request.query);
  const report = await cashSummaryService.getIntentReport(request.user.sub, query);
  reply.send(report);
}
