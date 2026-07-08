import type { UserPublic } from '../models/index.js';

export interface AuthResponseDto {
  user: UserPublic;
  token: string;
}

export interface MessageResponseDto {
  message: string;
}

export interface ErrorResponseDto {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
}
