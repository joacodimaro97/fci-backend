import type { FastifyReply, FastifyRequest } from 'fastify';
import { creditService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  calendarQuerySchema,
  createCreditSchema,
  creditIdParamSchema,
  creditQuerySchema,
  installmentParamsSchema,
  payInstallmentSchema,
  summaryQuerySchema,
  updateCreditSchema,
  updateInstallmentSchema,
} from '../validators/credit.validator.js';

export async function getAll(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(creditQuerySchema, request.query);
  const credits = await creditService.getAll(request.user.sub, query);
  reply.send(credits);
}

export async function getSummary(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(summaryQuerySchema, request.query);
  const summary = await creditService.getSummary(request.user.sub, query);
  reply.send(summary);
}

export async function getCalendar(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(calendarQuerySchema, request.query);
  const calendar = await creditService.getCalendar(request.user.sub, query);
  reply.send(calendar);
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(creditIdParamSchema, request.params);
  const credit = await creditService.getById(request.user.sub, id);
  reply.send(credit);
}

export async function create(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(createCreditSchema, request.body);
  const credit = await creditService.create(request.user.sub, input);
  reply.status(201).send(credit);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(creditIdParamSchema, request.params);
  const input = validate(updateCreditSchema, request.body);
  const credit = await creditService.update(request.user.sub, id, input);
  reply.send(credit);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(creditIdParamSchema, request.params);
  await creditService.delete(request.user.sub, id);
  reply.status(204).send();
}

export async function updateInstallment(
  request: FastifyRequest<{
    Params: { id: string; installmentId: string };
    Body: unknown;
  }>,
  reply: FastifyReply,
): Promise<void> {
  const { id, installmentId } = validate(installmentParamsSchema, request.params);
  const input = validate(updateInstallmentSchema, request.body);
  const credit = await creditService.updateInstallmentDueDate(
    request.user.sub,
    id,
    installmentId,
    input,
  );
  reply.send(credit);
}

export async function payInstallment(
  request: FastifyRequest<{
    Params: { id: string; installmentId: string };
    Body: unknown;
  }>,
  reply: FastifyReply,
): Promise<void> {
  const { id, installmentId } = validate(installmentParamsSchema, request.params);
  const input = validate(payInstallmentSchema, request.body);
  const credit = await creditService.payInstallment(
    request.user.sub,
    id,
    installmentId,
    input,
  );
  reply.send(credit);
}

export async function unpayInstallment(
  request: FastifyRequest<{ Params: { id: string; installmentId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id, installmentId } = validate(installmentParamsSchema, request.params);
  const credit = await creditService.unpayInstallment(request.user.sub, id, installmentId);
  reply.send(credit);
}
