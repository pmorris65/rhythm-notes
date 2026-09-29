import { fillPeriod, withFlow, withPeriod } from '../actions';
import { emptyLog, type DayLog } from '../types';

describe('withPeriod', () => {
  it('keeps other logged details', () => {
    const log = { ...emptyLog('2026-01-01'), note: 'hi', symptoms: ['cramps'] };
    expect(withPeriod(log, log.date, true)).toMatchObject({ period: true, note: 'hi', symptoms: ['cramps'] });
  });

  it('clears a period flow when unmarking but keeps spotting', () => {
    const heavy: DayLog = { ...emptyLog('2026-01-01'), period: true, flow: 'heavy' };
    expect(withPeriod(heavy, heavy.date, false).flow).toBeNull();
    const spotting: DayLog = { ...emptyLog('2026-01-01'), flow: 'spotting' };
    expect(withPeriod(spotting, spotting.date, false).flow).toBe('spotting');
  });
});

describe('fillPeriod', () => {
  it('fills only the days not already marked', () => {
    const existing = new Map<string, DayLog>([
      ['2026-01-01', { ...emptyLog('2026-01-01'), period: true }],
      ['2026-01-03', { ...emptyLog('2026-01-03'), note: 'kept' }],
    ]);
    const filled = fillPeriod((d) => existing.get(d), '2026-01-01', '2026-01-04');
    expect(filled.map((l) => l.date)).toEqual(['2026-01-02', '2026-01-03', '2026-01-04']);
    expect(filled.every((l) => l.period)).toBe(true);
    expect(filled[1].note).toBe('kept');
  });
});

describe('withFlow', () => {
  it('marks light to heavy flow as a period day, but not spotting', () => {
    const log = emptyLog('2026-01-01');
    expect(withFlow(log, 'light').period).toBe(true);
    expect(withFlow(log, 'spotting').period).toBe(false);
    expect(withFlow({ ...log, period: true }, null)).toMatchObject({ period: true, flow: null });
  });
});
