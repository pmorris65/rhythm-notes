import { cycleDay, deriveCycles, derivePeriods, periodDates } from '../cycles';
import { logsFor, periodsFrom } from './helpers';

describe('derivePeriods', () => {
  it('groups consecutive days into periods', () => {
    expect(
      derivePeriods(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-29', '2026-01-30']),
    ).toEqual([
      { start: '2026-01-01', end: '2026-01-03', length: 3 },
      { start: '2026-01-29', end: '2026-01-30', length: 2 },
    ]);
  });

  it('bridges a single forgotten day in the middle of a period', () => {
    expect(derivePeriods(['2026-01-01', '2026-01-02', '2026-01-04', '2026-01-05'])).toEqual([
      { start: '2026-01-01', end: '2026-01-05', length: 5 },
    ]);
  });

  it('ignores order and duplicates', () => {
    expect(derivePeriods(['2026-01-02', '2026-01-01', '2026-01-02'])).toEqual([
      { start: '2026-01-01', end: '2026-01-02', length: 2 },
    ]);
  });

  it('returns nothing for no data', () => {
    expect(derivePeriods([])).toEqual([]);
  });
});

describe('deriveCycles', () => {
  it('measures each cycle from start to next start', () => {
    const cycles = deriveCycles(periodsFrom(['2026-01-01', '2026-01-29', '2026-02-28']));
    expect(cycles).toEqual([
      { start: '2026-01-01', end: '2026-01-28', length: 28, periodLength: 5 },
      { start: '2026-01-29', end: '2026-02-27', length: 30, periodLength: 5 },
      { start: '2026-02-28', periodLength: 5 },
    ]);
  });
});

describe('periodDates', () => {
  it('only includes days marked as period', () => {
    const logs = [...logsFor(['2026-01-02']), ...logsFor(['2026-01-01'], { period: false })];
    expect(periodDates(logs)).toEqual(['2026-01-02']);
  });
});

describe('cycleDay', () => {
  it('counts from the latest period start', () => {
    const periods = periodsFrom(['2026-01-01', '2026-01-29']);
    expect(cycleDay(periods, '2026-01-29')).toBe(1);
    expect(cycleDay(periods, '2026-02-10')).toBe(13);
    expect(cycleDay(periods, '2026-01-10')).toBe(10);
  });

  it('is null before anything is logged', () => {
    expect(cycleDay([], '2026-01-01')).toBeNull();
    expect(cycleDay(periodsFrom(['2026-02-01']), '2026-01-01')).toBeNull();
  });
});
