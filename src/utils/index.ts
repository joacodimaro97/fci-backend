import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

/**
 * Parsea fechas evitando el off-by-one de zona horaria.
 *
 * `new Date("YYYY-MM-DD")` se interpreta como medianoche UTC.
 * En Argentina (UTC-3) eso cae el día anterior.
 * Por eso las fechas solo-día se guardan como mediodía UTC del día calendario.
 */
export function parseDate(dateString: string): Date {
  if (DATE_ONLY_REGEX.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0, 0));
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Fecha inválida');
  }

  // Si viene con hora, normalizamos al día calendario en UTC (mediodía)
  // para que no dependa de la TZ del servidor al comparar/filtrar.
  if (dateString.includes('T') || dateString.includes(' ')) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0),
    );
  }

  return date;
}

/**
 * Normaliza fechas de rendimiento al día calendario (mediodía UTC).
 * Evita duplicados por diferencias de hora/zona horaria.
 */
export function normalizePerformanceDate(dateString: string): Date {
  return parseDate(dateString);
}

/** Inicio del día calendario en UTC (para filtros). */
export function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

/** Fin del día calendario en UTC (para filtros). */
export function endOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

/** Día calendario de "hoy" en Argentina (UTC-3, sin DST). */
export function todayCalendarDate(): Date {
  const now = new Date();
  const arOffsetMs = -3 * 60 * 60 * 1000;
  const arNow = new Date(now.getTime() + arOffsetMs);
  return new Date(
    Date.UTC(arNow.getUTCFullYear(), arNow.getUTCMonth(), arNow.getUTCDate(), 12, 0, 0, 0),
  );
}
