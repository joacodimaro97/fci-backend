import type { FastifyReply, FastifyRequest } from 'fastify';
import { transferService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  createTransferSchema,
  transferIdParamSchema,
  transferQuerySchema,
} from '../validators/transfer.validator.js';

export async function getAll(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(transferQuerySchema, request.query);
  const transfers = await transferService.getAll(request.user.sub, query);
  reply.send(transfers);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(createTransferSchema, request.body);
  const transfer = await transferService.create(request.user.sub, input);
  reply.status(201).send(transfer);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(transferIdParamSchema, request.params);
  await transferService.delete(request.user.sub, id);
  reply.status(204).send();
}
