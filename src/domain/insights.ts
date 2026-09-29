import { deriveCycles, isPlausibleCycleLength } from './cycles';
import { diffDays, type ISODate } from './dates';
import type { Cycle, DayLog, Period } from './types';

export interface CycleStats {
  averageCycle: number | null;
  averagePeriod: number | null;
  shortestCycle: number | null;
  longestCycle: number | null;
  /** Number of completed cycles the stats are based on. */
  completedCycles: number;
  /** All cycles, most recent first. */
  history: Cycle[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function cycleStats(periods: Period[]): CycleStats {
  const cycles = deriveCycles(periods);
  const lengths = cycles
    .map((c) => c.length)
    .filter((l): l is number => l !== undefined && isPlausibleCycleLength(l));
  const periodLengths = periods.filter((p) => p.length > 1).map((p) => p.length);
  const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  return {
    averageCycle: avg(lengths),
    averagePeriod: avg(periodLengths),
    shortestCycle: lengths.length ? Math.min(...lengths) : null,
    longestCycle: lengths.length ? Math.max(...lengths) : null,
    completedCycles: lengths.length,
    history: [...cycles].reverse(),
  };
}

/** Rough cycle phases, named so they read neutrally. */
export type Phase = 'during' | 'after' | 'before';
export const PHASES: Phase[] = ['during', 'after', 'before'];

/** The last week of a cycle counts as "before" the next period. */
const BEFORE_WINDOW = 7;

export interface SymptomCount {
  symptom: string;
  count: number;
}

export interface SymptomInsights {
  overall: SymptomCount[];
  byPhase: Record<Phase, SymptomCount[]>;
}

function phaseOf(date: ISODate, cycle: Cycle): Phase | null {
  if (!cycle.end || date < cycle.start || date > cycle.end) return null;
  if (diffDays(cycle.start, date) < cycle.periodLength) return 'during';
  if (diffDays(date, cycle.end) < BEFORE_WINDOW) return 'before';
  return 'after';
}

function top(counts: Map<string, number>, limit: number): SymptomCount[] {
  return [...counts.entries()]
    .map(([symptom, count]) => ({ symptom, count }))
    .sort((a, b) => b.count - a.count || a.symptom.localeCompare(b.symptom))
    .slice(0, limit);
}

export function symptomInsights(logs: DayLog[], periods: Period[], limit = 5): SymptomInsights {
  const cycles = deriveCycles(periods).filter((c) => c.end);
  const overall = new Map<string, number>();
  const byPhase: Record<Phase, Map<string, number>> = {
    during: new Map(),
    after: new Map(),
    before: new Map(),
  };
  for (const log of logs) {
    if (log.symptoms.length === 0) continue;
    const cycle = cycles.find((c) => c.start <= log.date && c.end && log.date <= c.end);
    const phase = cycle ? phaseOf(log.date, cycle) : null;
    for (const s of log.symptoms) {
      overall.set(s, (overall.get(s) ?? 0) + 1);
      if (phase) byPhase[phase].set(s, (byPhase[phase].get(s) ?? 0) + 1);
    }
  }
  return {
    overall: top(overall, limit),
    byPhase: {
      during: top(byPhase.during, limit),
      after: top(byPhase.after, limit),
      before: top(byPhase.before, limit),
    },
  };
}
