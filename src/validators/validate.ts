import { ZodError } from 'zod';
import { ValidationError } from '../errors/AppError.js';

export function validate<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new ValidationError(messages);
    }
    throw error;
  }
}
