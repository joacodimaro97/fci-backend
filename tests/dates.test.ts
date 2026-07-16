import { describe, it, expect } from 'vitest';
import { endOfDay, parseDate, startOfDay, todayCalendarDate } from '../src/utils/index.js';

describe('parseDate timezone', () => {
  it('interpreta YYYY-MM-DD como el día calendario (no el día anterior)', () => {
    const date = parseDate('2026-07-16');

    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(6);
    expect(date.getUTCDate()).toBe(16);
    // Mediodía UTC: en Argentina (UTC-3) sigue siendo el mismo día calendario
    expect(date.getUTCHours()).toBe(12);
  });

  it('no corre el día al aplicar startOfDay/endOfDay', () => {
    const date = parseDate('2026-07-16');
    const start = startOfDay(date);
    const end = endOfDay(date);

    expect(start.getUTCDate()).toBe(16);
    expect(end.getUTCDate()).toBe(16);
    expect(start.getUTCHours()).toBe(0);
    expect(end.getUTCHours()).toBe(23);
  });

  it('normaliza ISO datetime al día UTC correspondiente', () => {
    const date = parseDate('2026-07-16T03:00:00.000Z');
    expect(date.getUTCDate()).toBe(16);
    expect(date.getUTCHours()).toBe(12);
  });

  it('todayCalendarDate devuelve mediodía UTC de un día válido', () => {
    const today = todayCalendarDate();
    expect(today.getUTCHours()).toBe(12);
    expect(Number.isNaN(today.getTime())).toBe(false);
  });
});
