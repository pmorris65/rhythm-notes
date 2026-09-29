import type { DayLog } from '../domain/types';

/** Everything the app stores, behind one interface so storage can be swapped or faked. */
export interface Repository {
  /** True when data is encrypted at rest (SQLCipher is compiled in). */
  readonly encrypted: boolean;
  loadLogs(): Promise<DayLog[]>;
  /** Saves logs, replacing any existing log for the same date. */
  saveLogs(logs: DayLog[]): Promise<void>;
  deleteLogs(dates: string[]): Promise<void>;
  getValue<T>(key: string): Promise<T | null>;
  setValue(key: string, value: unknown): Promise<void>;
  /** Replaces all logs (used when restoring a backup). */
  replaceLogs(logs: DayLog[]): Promise<void>;
  /** Permanently deletes the database. The repository can't be used afterwards. */
  destroy(): Promise<void>;
}

export const KEYS = {
  settings: 'settings',
  decoyNote: 'decoyNote',
} as const;
