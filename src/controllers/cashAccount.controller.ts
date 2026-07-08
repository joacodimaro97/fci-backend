import type { FastifyReply, FastifyRequest } from 'fastify';
import { cashAccountService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  cashAccountIdParamSchema,
  createCashAccountSchema,
  updateCashAccountSchema,
} from '../validators/cashAccount.validator.js';

export async function getAll(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const accounts = await cashAccountService.getAll(request.user.sub);
  reply.send(accounts);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(createCashAccountSchema, request.body);
  const account = await cashAccountService.create(request.user.sub, input);
  reply.status(201).send(account);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(cashAccountIdParamSchema, request.params);
  const input = validate(updateCashAccountSchema, request.body);
  const account = await cashAccountService.update(request.user.sub, id, input);
  reply.send(account);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(cashAccountIdParamSchema, request.params);
  await cashAccountService.delete(request.user.sub, id);
  reply.status(204).send();
}
