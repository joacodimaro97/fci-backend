import type { FastifyReply, FastifyRequest } from 'fastify';
import { fundingService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  createFundingSchema,
  fundingIdParamSchema,
  fundingQuerySchema,
} from '../validators/funding.validator.js';

export async function getAll(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(fundingQuerySchema, request.query);
  const fundings = await fundingService.getAll(request.user.sub, query);
  reply.send(fundings);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(createFundingSchema, request.body);
  const funding = await fundingService.create(request.user.sub, input);
  reply.status(201).send(funding);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(fundingIdParamSchema, request.params);
  await fundingService.delete(request.user.sub, id);
  reply.status(204).send();
}
