import { cycleStats, symptomInsights } from '../insights';
import { emptyLog } from '../types';
import { periodsFrom, startsWithLengths } from './helpers';

describe('cycleStats', () => {
  it('summarises completed cycles', () => {
    const starts = startsWithLengths('2026-01-01', [27, 31, 29]);
    const stats = cycleStats(periodsFrom(starts, 4));
    expect(stats.averageCycle).toBe(29);
    expect(stats.averagePeriod).toBe(4);
    expect(stats.shortestCycle).toBe(27);
    expect(stats.longestCycle).toBe(31);
    expect(stats.completedCycles).toBe(3);
    expect(stats.history[0].start).toBe(starts[3]);
    expect(stats.history[0].length).toBeUndefined();
  });

  it('handles no data', () => {
    const stats = cycleStats([]);
    expect(stats.averageCycle).toBeNull();
    expect(stats.averagePeriod).toBeNull();
    expect(stats.history).toEqual([]);
  });
});

describe('symptomInsights', () => {
  it('counts symptoms overall and by phase', () => {
    const periods = periodsFrom(['2026-01-01', '2026-01-29', '2026-02-26'], 5);
    const logs = [
      { ...emptyLog('2026-01-02'), symptoms: ['cramps'] },
      { ...emptyLog('2026-01-30'), symptoms: ['cramps', 'fatigue'] },
      { ...emptyLog('2026-01-10'), symptoms: ['acne'] },
      { ...emptyLog('2026-01-25'), symptoms: ['bloating'] },
      { ...emptyLog('2026-02-24'), symptoms: ['bloating'] },
      // In the ongoing cycle: counted overall only.
      { ...emptyLog('2026-02-27'), symptoms: ['headache'] },
    ];
    const result = symptomInsights(logs, periods);
    expect(result.overall[0]).toEqual({ symptom: 'bloating', count: 2 });
    expect(result.overall.find((s) => s.symptom === 'headache')?.count).toBe(1);
    expect(result.byPhase.during).toEqual([
      { symptom: 'cramps', count: 2 },
      { symptom: 'fatigue', count: 1 },
    ]);
    expect(result.byPhase.after).toEqual([{ symptom: 'acne', count: 1 }]);
    expect(result.byPhase.before).toEqual([{ symptom: 'bloating', count: 2 }]);
  });
});
