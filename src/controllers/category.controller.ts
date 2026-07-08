import type { FastifyReply, FastifyRequest } from 'fastify';
import { categoryService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  categoryIdParamSchema,
  categoryQuerySchema,
  createCategorySchema,
  updateCategorySchema,
  type CategoryQueryInput,
} from '../validators/category.validator.js';

export async function getAll(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(categoryQuerySchema, request.query) as CategoryQueryInput;
  const categories = await categoryService.getAll(request.user.sub, query);
  reply.send(categories);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(createCategorySchema, request.body);
  const category = await categoryService.create(request.user.sub, input);
  reply.status(201).send(category);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(categoryIdParamSchema, request.params);
  const input = validate(updateCategorySchema, request.body);
  const category = await categoryService.update(request.user.sub, id, input);
  reply.send(category);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(categoryIdParamSchema, request.params);
  await categoryService.delete(request.user.sub, id);
  reply.status(204).send();
}
