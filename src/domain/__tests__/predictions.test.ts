import { addDays, dateRange } from '../dates';
import { calendarMarks, predict, type PredictionInput } from '../predictions';
import type { DayLog } from '../types';
import { logsFor, periodDays, periodsFrom, startsWithLengths } from './helpers';

const defaults = { defaultCycleLength: 28, defaultPeriodLength: 5 };

function input(overrides: Partial<PredictionInput> & Pick<PredictionInput, 'periods' | 'today'>) {
  return { ...defaults, ...overrides };
}

function logMap(logs: DayLog[]): Map<string, DayLog> {
  return new Map(logs.map((l) => [l.date, l]));
}

describe('predict', () => {
  it('returns null with no periods logged', () => {
    expect(predict(input({ periods: [], today: '2026-01-10' }))).toBeNull();
  });

  it('uses the default cycle length when only one period is logged', () => {
    const p = predict(input({ periods: periodsFrom(['2026-01-01']), today: '2026-01-10' }))!;
    expect(p.cycleLength).toBe(28);
    expect(p.periodLength).toBe(5);
    expect(p.basedOnCycles).toBe(0);
    expect(p.cycles[0].start).toBe('2026-01-29');
    expect(p.cycles[0].end).toBe('2026-02-02');
    // Not enough history yet, so a small range is shown.
    expect(p.cycles[0].earliestStart).toBe('2026-01-27');
    expect(p.cycles[0].latestStart).toBe('2026-01-31');
  });

  it('averages recent cycle lengths and period lengths', () => {
    const starts = startsWithLengths('2026-01-01', [30, 30, 30]);
    const periods = periodsFrom(starts, 4);
    const p = predict(input({ periods, today: addDays(starts[3], 10) }))!;
    expect(p.cycleLength).toBe(30);
    expect(p.periodLength).toBe(4);
    expect(p.variability).toBe(0);
    expect(p.irregular).toBe(false);
    expect(p.cycles[0].start).toBe(addDays(starts[3], 30));
    expect(p.cycles[0].earliestStart).toBe(p.cycles[0].start);
  });

  it('predicts several future cycles, each one cycle length apart', () => {
    const starts = startsWithLengths('2026-01-01', [28, 28]);
    const p = predict(input({ periods: periodsFrom(starts), today: '2026-03-05' }))!;
    expect(p.cycles).toHaveLength(4);
    expect(p.cycles.map((c) => c.start)).toEqual(['2026-03-26', '2026-04-23', '2026-05-21', '2026-06-18']);
  });

  it('widens the range for later cycles', () => {
    const starts = startsWithLengths('2026-01-01', [28, 28, 28]);
    const p = predict(input({ periods: periodsFrom(starts), today: '2026-03-30' }))!;
    const spreads = p.cycles.map((c) => {
      const earliest = Math.round((Date.parse(c.start) - Date.parse(c.earliestStart)) / 864e5);
      const latest = Math.round((Date.parse(c.latestStart) - Date.parse(c.start)) / 864e5);
      return Math.max(earliest, latest);
    });
    for (let i = 1; i < spreads.length; i++) expect(spreads[i]).toBeGreaterThanOrEqual(spreads[i - 1]);
    expect(spreads[spreads.length - 1]).toBeGreaterThan(0);
  });

  it('marks cycles as irregular when lengths vary a lot', () => {
    const starts = startsWithLengths('2026-01-01', [24, 35, 26, 38]);
    const p = predict(input({ periods: periodsFrom(starts), today: addDays(starts[4], 3) }))!;
    expect(p.irregular).toBe(true);
    expect(p.variability).toBeGreaterThanOrEqual(5);
  });

  it('ignores implausible cycle lengths caused by missed logs', () => {
    // 84 days between the 2nd and 3rd period: two periods were not logged.
    const starts = startsWithLengths('2026-01-01', [28, 84, 28]);
    const p = predict(input({ periods: periodsFrom(starts), today: addDays(starts[3], 3) }))!;
    expect(p.cycleLength).toBe(28);
    expect(p.basedOnCycles).toBe(2);
  });

  it('only uses the most recent six cycles', () => {
    const starts = startsWithLengths('2025-01-01', [40, 40, 40, 30, 30, 30, 30, 30, 30]);
    const p = predict(input({ periods: periodsFrom(starts), today: addDays(starts[9], 3) }))!;
    expect(p.cycleLength).toBe(30);
  });

  it('shows the next period as starting today when it is late', () => {
    const p = predict(input({ periods: periodsFrom(['2026-01-01']), today: '2026-02-03' }))!;
    expect(p.lateByDays).toBe(5); // expected Jan 29
    expect(p.cycles[0].start).toBe('2026-02-03');
    expect(p.cycles[0].earliestStart).toBe('2026-02-03');
    expect(p.cycles[1].start).toBe('2026-03-03');
  });

  it('detects an ongoing period and the days still expected', () => {
    const periods = periodsFrom(startsWithLengths('2026-01-01', [28]), 5);
    // Current period: only the first two days logged so far.
    const current = periodsFrom(['2026-02-26'], 2);
    const p = predict(input({ periods: [...periods.slice(0, 1), ...current], today: '2026-02-27' }))!;
    expect(p.ongoingPeriod?.start).toBe('2026-02-26');
    expect(p.ongoingRemaining).toEqual(['2026-02-28', '2026-03-01', '2026-03-02']);
    // An in-progress period does not drag down the average period length.
    expect(p.periodLength).toBe(5);
  });

  it('treats a period with only the first day logged as ongoing for its usual length', () => {
    const p = predict(input({ periods: periodsFrom(['2026-01-01'], 1), today: '2026-01-04' }))!;
    expect(p.ongoingPeriod?.start).toBe('2026-01-01');
    expect(p.ongoingRemaining).toEqual(['2026-01-04', '2026-01-05']);
    expect(p.periodLength).toBe(5);
  });

  it('stops treating a period as ongoing once the user says it ended', () => {
    const p = predict(
      input({ periods: periodsFrom(['2026-01-01'], 2), today: '2026-01-02', periodEndedFor: '2026-01-01' }),
    )!;
    expect(p.ongoingPeriod).toBeNull();
    expect(p.ongoingRemaining).toEqual([]);
  });

  it('estimates ovulation 14 days before the next period with a 7 day fertile window', () => {
    const p = predict(input({ periods: periodsFrom(['2026-01-01']), today: '2026-01-06' }))!;
    const c = p.cycles[0];
    expect(c.ovulation).toBe('2026-01-15');
    expect(dateRange(c.fertileStart, c.fertileEnd)).toHaveLength(7);
    expect(c.fertileEnd).toBe('2026-01-16');
  });

  it('ignores periods logged in the future', () => {
    const periods = periodsFrom(['2026-01-01', '2026-03-01']);
    const p = predict(input({ periods, today: '2026-01-10' }))!;
    expect(p.cycles[0].start).toBe('2026-01-29');
  });
});

describe('calendarMarks', () => {
  it('marks the predicted next period days on the calendar', () => {
    const starts = startsWithLengths('2026-01-01', [28, 28, 28]);
    const logs = logsFor(periodDays(starts));
    const p = predict(input({ periods: periodsFrom(starts), today: '2026-03-30' }))!;
    const marks = calendarMarks(p, logMap(logs), '2026-03-30', false);
    // Last period started Mar 26, so the next is Apr 23 – 27.
    for (const d of dateRange('2026-04-23', '2026-04-27')) expect(marks.predicted.get(d)).toBe('likely');
    expect(marks.predicted.get('2026-04-22')).toBeUndefined();
    expect(marks.predicted.get('2026-04-28')).toBeUndefined();
    // Later cycles are shown too.
    expect(marks.predicted.get('2026-05-21')).toBe('likely');
    expect(marks.fertile.size).toBe(0);
  });

  it('marks the uncertain edges of the range as possible', () => {
    const p = predict(input({ periods: periodsFrom(['2026-01-01']), today: '2026-01-10' }))!;
    const marks = calendarMarks(p, new Map(), '2026-01-10', false);
    expect(marks.predicted.get('2026-01-27')).toBe('possible');
    expect(marks.predicted.get('2026-01-29')).toBe('likely');
    expect(marks.predicted.get('2026-02-02')).toBe('likely');
    expect(marks.predicted.get('2026-02-04')).toBe('possible');
    expect(marks.predicted.get('2026-02-05')).toBeUndefined();
  });

  it('never marks past days or already-logged period days as predicted', () => {
    const logs = logsFor(['2026-01-01', '2026-01-02']);
    const p = predict(input({ periods: periodsFrom(['2026-01-01'], 2), today: '2026-01-02' }))!;
    const marks = calendarMarks(p, logMap(logs), '2026-01-02', false);
    expect(marks.predicted.has('2026-01-01')).toBe(false);
    expect(marks.predicted.has('2026-01-02')).toBe(false);
    // Rest of the current period is still expected.
    expect(marks.predicted.get('2026-01-03')).toBe('likely');
    expect(marks.predicted.get('2026-01-05')).toBe('likely');
  });

  it('updates as soon as a new period is logged', () => {
    const today = '2026-01-26';
    const before = predict(input({ periods: periodsFrom(['2026-01-01']), today }))!;
    expect(calendarMarks(before, new Map(), today, false).predicted.get('2026-01-29')).toBe('likely');

    // Period came early, on the 26th.
    const logs = logsFor(['2026-01-01', '2026-01-26']);
    const after = predict(input({ periods: periodsFrom(['2026-01-01', '2026-01-26'], 1), today }))!;
    const marks = calendarMarks(after, logMap(logs), today, false);
    expect(after.cycles[0].start).toBe(addDays('2026-01-26', 25));
    expect(marks.predicted.get('2026-02-01')).toBeUndefined();
    expect(marks.predicted.get('2026-01-27')).toBe('likely');
  });

  it('adds fertile and peak days only when enabled', () => {
    const p = predict(input({ periods: periodsFrom(['2026-01-01']), today: '2026-01-06' }))!;
    const marks = calendarMarks(p, new Map(), '2026-01-06', true);
    expect(marks.fertile.has('2026-01-10')).toBe(true);
    expect(marks.fertile.has('2026-01-16')).toBe(true);
    expect(marks.ovulation.has('2026-01-15')).toBe(true);
    expect(marks.fertile.has('2026-01-17')).toBe(false);
  });

  it('returns empty marks without a prediction', () => {
    const marks = calendarMarks(null, new Map(), '2026-01-01', true);
    expect(marks.predicted.size + marks.fertile.size + marks.ovulation.size).toBe(0);
  });
});
