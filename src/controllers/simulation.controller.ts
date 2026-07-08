import type { FastifyReply, FastifyRequest } from 'fastify';
import { simulationService } from '../services/index.js';
import { validate } from '../validators/validate.js';
import {
  runSimulationSchema,
  saveSimulationSchema,
  simulationIdParamSchema,
  simulationQuerySchema,
  type RunSimulationInput,
  type SaveSimulationInput,
} from '../validators/simulation.validator.js';

export async function run(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(runSimulationSchema, request.body) as RunSimulationInput;
  const result = await simulationService.run(request.user.sub, input);
  reply.send(result);
}

export async function save(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const input = validate(saveSimulationSchema, request.body) as SaveSimulationInput;
  const result = await simulationService.save(request.user.sub, input);
  reply.status(201).send(result);
}

export async function getAll(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
): Promise<void> {
  const query = validate(simulationQuerySchema, request.query);
  const simulations = await simulationService.getAll(request.user.sub, query);
  reply.send(simulations);
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(simulationIdParamSchema, request.params);
  const simulation = await simulationService.getById(request.user.sub, id);
  reply.send(simulation);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = validate(simulationIdParamSchema, request.params);
  await simulationService.delete(request.user.sub, id);
  reply.status(204).send();
}
