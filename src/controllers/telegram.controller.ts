import type { FastifyReply, FastifyRequest } from 'fastify';
import { telegramService } from '../services/index.js';

export async function createLink(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = await telegramService.createLink(request.user.sub);
  reply.send(result);
}

export async function unlink(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = await telegramService.unlink(request.user.sub);
  reply.send(result);
}

export async function getStatus(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = await telegramService.getStatus(request.user.sub);
  reply.send(result);
}
