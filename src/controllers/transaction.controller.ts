import type { FastifyReply, FastifyRequest } from 'fastify';
import { transactionService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  createTransactionSchema,
  transactionIdParamSchema,
  transactionQuerySchema,
  updateTransactionSchema,
} from '../validators/transaction.validator.js';

export async function getAll(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(transactionQuerySchema, request.query);
  const transactions = await transactionService.getAll(request.user.sub, query);
  reply.send(transactions);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(createTransactionSchema, request.body);
  const transaction = await transactionService.create(request.user.sub, input);
  reply.status(201).send(transaction);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(transactionIdParamSchema, request.params);
  const input = validate(updateTransactionSchema, request.body);
  const transaction = await transactionService.update(request.user.sub, id, input);
  reply.send(transaction);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(transactionIdParamSchema, request.params);
  await transactionService.delete(request.user.sub, id);
  reply.status(204).send();
}
