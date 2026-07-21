import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  telegramChatId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): {
  id: string;
  name: string;
  email: string;
  telegramLinked: boolean;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    telegramLinked: user.telegramChatId != null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
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

/**
 * Suma meses a una fecha calendario UTC (mediodía),
 * clampando el día al último del mes destino (ej. 31 ene + 1 mes → 28/29 feb).
 */
export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const firstOfMonth = new Date(Date.UTC(year, month, 1, 12, 0, 0, 0));
  const lastDay = new Date(
    Date.UTC(firstOfMonth.getUTCFullYear(), firstOfMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      firstOfMonth.getUTCFullYear(),
      firstOfMonth.getUTCMonth(),
      Math.min(day, lastDay),
      12,
      0,
      0,
      0,
    ),
  );
}

/** Montos de cuotas iguales; el residuo de centavos va a la última. */
export function splitEqualAmounts(total: number, count: number): number[] {
  if (count < 1) {
    throw new Error('La cantidad de cuotas debe ser al menos 1');
  }
  const base = Math.round((total / count) * 100) / 100;
  const amounts = Array.from({ length: count }, () => base);
  const sumExceptLast = base * (count - 1);
  amounts[count - 1] = Math.round((total - sumExceptLast) * 100) / 100;
  return amounts;
}

