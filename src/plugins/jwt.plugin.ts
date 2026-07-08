import type { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';
import { setSignToken } from '../services/index.js';

async function jwtPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(fastifyJwt, {
    secret: env.jwtSecret,
    sign: {
      expiresIn: env.jwtExpiresIn,
    },
  });

  setSignToken((payload) => fastify.jwt.sign(payload));
}

export default fp(jwtPlugin, {
  name: 'jwt',
});
