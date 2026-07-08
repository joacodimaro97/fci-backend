import type { FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError.js';
import type { JwtPayload } from '../types/index.js';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
}

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): ErrorResponse {
  switch (error.code) {
    case 'P2002': {
      const target = (error.meta?.target as string[] | undefined)?.join(', ') ?? 'campos únicos';
      return {
        statusCode: 409,
        error: 'Conflict',
        message: `Ya existe un registro con esos valores (${target})`,
        code: 'UNIQUE_CONSTRAINT',
      };
    }
    case 'P2025':
      return {
        statusCode: 404,
        error: 'Not Found',
        message: 'El registro solicitado no existe',
        code: 'NOT_FOUND',
      };
    case 'P2003':
      return {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Referencia inválida a un registro relacionado',
        code: 'FOREIGN_KEY_CONSTRAINT',
      };
    default:
      return {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Solicitud inválida a la base de datos',
        code: error.code,
      };
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify<JwtPayload>();
  } catch {
    reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token inválido o expirado',
      code: 'UNAUTHORIZED',
    });
  }
}

export function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof AppError) {
    request.log.warn(
      { err: error, statusCode: error.statusCode, code: error.code },
      error.message,
    );
    reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
      code: error.code,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(error);
    request.log.warn(
      { err: error, statusCode: mapped.statusCode, code: mapped.code },
      mapped.message,
    );
    reply.status(mapped.statusCode).send(mapped);
    return;
  }

  request.log.error({ err: error }, 'Error interno del servidor');
  reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
  });
}
