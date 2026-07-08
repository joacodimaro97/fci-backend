import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function toPublicUser<T extends { password: string }>(
  user: T,
): Omit<T, 'password'> {
  const { password: _password, ...publicUser } = user;
  return publicUser;
}

export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Fecha inválida');
  }
  return date;
}

/**
 * Normaliza fechas de rendimiento al inicio del día local.
 * Evita duplicados por diferencias de hora/zona horaria.
 */
export function normalizePerformanceDate(dateString: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year!, month! - 1, day!, 0, 0, 0, 0);
  }

  return startOfDay(parseDate(dateString));
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}
