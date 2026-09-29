import { useMemo } from 'react';

import { cycleDay, derivePeriods, periodDates } from '../domain/cycles';
import type { ISODate } from '../domain/dates';
import { calendarMarks, predict } from '../domain/predictions';
import type { DayLog } from '../domain/types';
import { useStore } from './store';

/** Periods, predictions and calendar marks, recomputed whenever logs or settings change. */
export function useCycleData() {
  const logs = useStore((s) => s.logs);
  const today = useStore((s) => s.today);
  const defaultCycleLength = useStore((s) => s.settings.defaultCycleLength);
  const defaultPeriodLength = useStore((s) => s.settings.defaultPeriodLength);
  const periodEndedFor = useStore((s) => s.settings.periodEndedFor);
  const showFertile = useStore((s) => s.settings.showFertileWindow);

  return useMemo(() => {
    const list = Object.values(logs);
    const logMap = new Map<ISODate, DayLog>(Object.entries(logs));
    const periods = derivePeriods(periodDates(list));
    const prediction = predict({ periods, today, defaultCycleLength, defaultPeriodLength, periodEndedFor });
    return {
      logs: list,
      logMap,
      periods,
      prediction,
      marks: calendarMarks(prediction, logMap, today, showFertile),
      cycleDay: cycleDay(periods, today),
      today,
    };
  }, [logs, today, defaultCycleLength, defaultPeriodLength, periodEndedFor, showFertile]);
}

export type CycleData = ReturnType<typeof useCycleData>;
