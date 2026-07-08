import type { FastifyReply, FastifyRequest } from 'fastify';
import { movementService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  createMovementSchema,
  movementIdParamSchema,
  movementQuerySchema,
  updateMovementSchema,
} from '../validators/movement.validator.js';

export async function getAll(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(movementQuerySchema, request.query);
  const movements = await movementService.getAll(request.user.sub, query);
  reply.send(movements);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(createMovementSchema, request.body);
  const movement = await movementService.create(request.user.sub, input);
  reply.status(201).send(movement);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(movementIdParamSchema, request.params);
  const input = validate(updateMovementSchema, request.body);
  const movement = await movementService.update(request.user.sub, id, input);
  reply.send(movement);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(movementIdParamSchema, request.params);
  await movementService.delete(request.user.sub, id);
  reply.status(204).send();
}
