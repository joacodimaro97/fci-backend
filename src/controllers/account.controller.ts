import type { FastifyReply, FastifyRequest } from 'fastify';
import { accountService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  accountIdParamSchema,
  createAccountSchema,
  updateAccountSchema,
} from '../validators/account.validator.js';

export async function getAll(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const accounts = await accountService.getAll(request.user.sub);
  reply.send(accounts);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(createAccountSchema, request.body);
  const account = await accountService.create(request.user.sub, input);
  reply.status(201).send(account);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(accountIdParamSchema, request.params);
  const input = validate(updateAccountSchema, request.body);
  const account = await accountService.update(request.user.sub, id, input);
  reply.send(account);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(accountIdParamSchema, request.params);
  await accountService.delete(request.user.sub, id);
  reply.status(204).send();
}
