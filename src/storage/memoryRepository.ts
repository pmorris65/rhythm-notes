import type { DayLog } from '../domain/types';
import type { Repository } from './repository';

export interface MemorySnapshot {
  logs: DayLog[];
  values: Record<string, unknown>;
}

/**
 * In-memory storage, used by tests and the web preview. `onChange` lets the
 * caller persist a snapshot after every write.
 */
export function createMemoryRepository(
  initial?: MemorySnapshot | null,
  onChange?: (snapshot: MemorySnapshot | null) => void,
): Repository {
  const logs = new Map<string, DayLog>((initial?.logs ?? []).map((l) => [l.date, l]));
  const values = new Map<string, unknown>(Object.entries(initial?.values ?? {}));
  const changed = () =>
    onChange?.({ logs: [...logs.values()], values: Object.fromEntries(values.entries()) });
  const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

  return {
    encrypted: false,
    async loadLogs() {
      return [...logs.values()].map(clone).sort((a, b) => (a.date < b.date ? -1 : 1));
    },
    async saveLogs(items) {
      for (const log of items) logs.set(log.date, clone(log));
      changed();
    },
    async deleteLogs(dates) {
      for (const d of dates) logs.delete(d);
      changed();
    },
    async getValue<T>(key: string) {
      return values.has(key) ? clone(values.get(key) as T) : null;
    },
    async setValue(key, value) {
      values.set(key, clone(value));
      changed();
    },
    async replaceLogs(items) {
      logs.clear();
      for (const log of items) logs.set(log.date, clone(log));
      changed();
    },
    async destroy() {
      logs.clear();
      values.clear();
      onChange?.(null);
    },
  };
}
