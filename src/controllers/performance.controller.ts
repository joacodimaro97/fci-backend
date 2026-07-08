import type { FastifyReply, FastifyRequest } from 'fastify';
import { performanceService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  createPerformanceSchema,
  performanceIdParamSchema,
  performancePeriodQuerySchema,
  performanceQuerySchema,
  updatePerformanceSchema,
} from '../validators/performance.validator.js';

export async function getAll(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(performanceQuerySchema, request.query);
  const performances = await performanceService.getAll(request.user.sub, query);
  reply.send(performances);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(createPerformanceSchema, request.body);
  const result = await performanceService.create(request.user.sub, input);
  reply.status(result.created ? 201 : 200).send(result.performance);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(performanceIdParamSchema, request.params);
  const input = validate(updatePerformanceSchema, request.body);
  const performance = await performanceService.update(request.user.sub, id, input);
  reply.send(performance);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(performanceIdParamSchema, request.params);
  await performanceService.delete(request.user.sub, id);
  reply.status(204).send();
}

export async function getMonthly(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(performancePeriodQuerySchema, request.query);
  const data = await performanceService.getMonthly(request.user.sub, query);
  reply.send(data);
}

export async function getYearly(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(performancePeriodQuerySchema, request.query);
  const data = await performanceService.getYearly(request.user.sub, query);
  reply.send(data);
}
