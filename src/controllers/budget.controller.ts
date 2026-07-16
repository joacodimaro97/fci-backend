import type { FastifyReply, FastifyRequest } from 'fastify';
import { budgetService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  budgetIdParamSchema,
  createBudgetSchema,
  updateBudgetSchema,
} from '../validators/budget.validator.js';

export async function getAll(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const budgets = await budgetService.getAll(request.user.sub);
  reply.send(budgets);
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(budgetIdParamSchema, request.params);
  const budget = await budgetService.getById(request.user.sub, id);
  reply.send(budget);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(createBudgetSchema, request.body);
  const budget = await budgetService.create(request.user.sub, input);
  reply.status(201).send(budget);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(budgetIdParamSchema, request.params);
  const input = validate(updateBudgetSchema, request.body);
  const budget = await budgetService.update(request.user.sub, id, input);
  reply.send(budget);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(budgetIdParamSchema, request.params);
  await budgetService.delete(request.user.sub, id);
  reply.status(204).send();
}
