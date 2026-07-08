import type { FastifyRequest } from 'fastify';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JwtPayload;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

export interface AccountFilterQuery extends DateRangeQuery {
  accountId?: string;
}
