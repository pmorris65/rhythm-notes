import {
  addDays,
  dateRange,
  diffDays,
  formatRange,
  isISODate,
  monthGrid,
  shiftMonth,
  weekday,
} from '../dates';

describe('dates', () => {
  it('adds days across month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('is not affected by daylight saving changes', () => {
    // US and EU DST transitions in 2026.
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2);
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
  });

  it('computes weekdays', () => {
    expect(weekday('1970-01-01')).toBe(4); // Thursday
    expect(weekday('2026-09-29')).toBe(2); // Tuesday
    expect(weekday('1969-12-28')).toBe(0); // Sunday, before the epoch
  });

  it('builds date ranges inclusively', () => {
    expect(dateRange('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
    expect(dateRange('2026-03-02', '2026-03-01')).toEqual([]);
  });

  it('validates ISO dates', () => {
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2026-2-3')).toBe(false);
    expect(isISODate(20260203)).toBe(false);
  });

  it('shifts months across years', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 5, 14)).toEqual({ year: 2027, month: 7 });
  });

  it('builds a Sunday-first month grid of whole weeks', () => {
    const grid = monthGrid(2026, 9); // September 2026 starts on a Tuesday
    expect(grid[0]).toEqual([null, null, '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
  });

  it('formats ranges', () => {
    expect(formatRange('2026-03-04', '2026-03-08')).toBe('Mar 4 – 8');
    expect(formatRange('2026-03-30', '2026-04-03')).toBe('Mar 30 – Apr 3');
    expect(formatRange('2026-03-04', '2026-03-04')).toBe('Mar 4');
  });
});
