import { describe, it, expect } from 'vitest';
import { validate } from '../src/validators/validate.js';
import { registerSchema, loginSchema } from '../src/validators/auth.validator.js';
import { createAccountSchema } from '../src/validators/account.validator.js';
import { ValidationError } from '../src/errors/AppError.js';
import { InvestmentType } from '../src/types/enums.js';

describe('Validators', () => {
  it('registerSchema valida datos correctos', () => {
    const result = validate(registerSchema, {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.email).toBe('test@example.com');
  });

  it('registerSchema rechaza email inválido', () => {
    expect(() =>
      validate(registerSchema, {
        name: 'Test',
        email: 'invalid',
        password: 'password123',
      }),
    ).toThrow(ValidationError);
  });

  it('loginSchema valida credenciales', () => {
    const result = validate(loginSchema, {
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.email).toBe('test@example.com');
  });

  it('createAccountSchema valida cuenta', () => {
    const result = validate(createAccountSchema, {
      name: 'Mi Cuenta',
      investmentType: InvestmentType.FCI,
      currency: 'ARS',
    });
    expect(result.investmentType).toBe(InvestmentType.FCI);
  });
});
