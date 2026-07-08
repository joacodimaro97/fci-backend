import type { FastifyReply, FastifyRequest } from 'fastify';
import { authService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.validator.js';

export async function register(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(registerSchema, request.body);
  const result = await authService.register(input);
  reply.status(201).send(result);
}

export async function login(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(loginSchema, request.body);
  const result = await authService.login(input);
  reply.send(result);
}

export async function getMe(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await authService.getMe(request.user.sub);
  reply.send(user);
}
