import { create } from 'zustand';

import { fillPeriod, withPeriod } from '../domain/actions';
import { todayISO, type ISODate } from '../domain/dates';
import { DEFAULT_SETTINGS, type Settings } from '../domain/settings';
import { isEmptyLog, type DayLog } from '../domain/types';
import { sanitizeSettings } from '../domain/validate';
import { cancelAllReminders } from '../notifications/reminders';
import type { BackupContents } from '../security/backup';
import { clearPin, hasPin, setPin } from '../security/pin';
import { destroyDatabase, openRepository } from '../storage/openRepository';
import { KEYS, type Repository } from '../storage/repository';

export type Status = 'loading' | 'ready' | 'unreadable' | 'error';

interface State {
  status: Status;
  encrypted: boolean;
  settings: Settings;
  logs: Record<ISODate, DayLog>;
  today: ISODate;
  locked: boolean;
  pinSet: boolean;
  decoyNote: string;
  /** While > 0, leaving the app doesn't lock it (e.g. during a share sheet). */
  autoLockSuspended: number;
}

interface Actions {
  init(): Promise<void>;
  refreshToday(): void;
  saveLog(log: DayLog): Promise<void>;
  saveLogs(logs: DayLog[]): Promise<void>;
  startPeriod(date: ISODate): Promise<void>;
  endPeriod(start: ISODate, end: ISODate): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  setDecoyNote(text: string): Promise<void>;
  enableLock(pin: string): Promise<void>;
  disableLock(): Promise<void>;
  lock(): void;
  unlock(): void;
  withAutoLockSuspended<T>(task: () => Promise<T>): Promise<T>;
  restoreBackup(contents: BackupContents): Promise<void>;
  eraseEverything(): Promise<void>;
}

let repo: Repository | null = null;

function requireRepo(): Repository {
  if (!repo) throw new Error('Storage is not open yet');
  return repo;
}

const initialState: State = {
  status: 'loading',
  encrypted: false,
  settings: DEFAULT_SETTINGS,
  logs: {},
  today: todayISO(),
  locked: false,
  pinSet: false,
  decoyNote: '',
  autoLockSuspended: 0,
};

export const useStore = create<State & Actions>()((set, get) => ({
  ...initialState,

  async init() {
    set({ status: 'loading' });
    try {
      repo = await openRepository();
    } catch (error) {
      set({ status: (error as Error).name === 'DatabaseUnreadableError' ? 'unreadable' : 'error' });
      return;
    }
    try {
      const [logs, savedSettings, decoyNote, pinSet] = await Promise.all([
        repo.loadLogs(),
        repo.getValue<Settings>(KEYS.settings),
        repo.getValue<string>(KEYS.decoyNote),
        hasPin(),
      ]);
      const settings = sanitizeSettings(savedSettings);
      // A lock without a PIN can't be opened, so treat it as off.
      const lockOn = settings.lockEnabled && pinSet;
      set({
        status: 'ready',
        encrypted: repo.encrypted,
        logs: Object.fromEntries(logs.map((l) => [l.date, l])),
        settings: { ...settings, lockEnabled: lockOn },
        decoyNote: decoyNote ?? '',
        pinSet,
        locked: lockOn,
        today: todayISO(),
      });
    } catch {
      set({ status: 'error' });
    }
  },

  refreshToday() {
    const today = todayISO();
    if (today !== get().today) set({ today });
  },

  async saveLog(log) {
    await get().saveLogs([log]);
  },

  async saveLogs(items) {
    const r = requireRepo();
    const toDelete = items.filter(isEmptyLog).map((l) => l.date);
    const toSave = items.filter((l) => !isEmptyLog(l));
    if (toSave.length) await r.saveLogs(toSave);
    if (toDelete.length) await r.deleteLogs(toDelete);
    const logs = { ...get().logs };
    for (const date of toDelete) delete logs[date];
    for (const log of toSave) logs[log.date] = log;
    set({ logs });
  },

  async startPeriod(date) {
    const { logs, settings } = get();
    await get().saveLog(withPeriod(logs[date], date, true));
    if (settings.periodEndedFor) await get().updateSettings({ periodEndedFor: null });
  },

  async endPeriod(start, end) {
    const logs = get().logs;
    await get().saveLogs(fillPeriod((d) => logs[d], start, end));
    await get().updateSettings({ periodEndedFor: start });
  },

  async updateSettings(patch) {
    const settings = { ...get().settings, ...patch };
    await requireRepo().setValue(KEYS.settings, settings);
    set({ settings });
  },

  async setDecoyNote(text) {
    set({ decoyNote: text });
    await requireRepo().setValue(KEYS.decoyNote, text);
  },

  async enableLock(pin) {
    await setPin(pin);
    set({ pinSet: true });
    await get().updateSettings({ lockEnabled: true });
  },

  async disableLock() {
    await clearPin();
    set({ pinSet: false });
    await get().updateSettings({
      lockEnabled: false,
      biometricsEnabled: false,
      disguiseEnabled: false,
      wipeAfterFailedAttempts: false,
    });
  },

  lock() {
    const { settings, pinSet } = get();
    if (settings.lockEnabled && pinSet) set({ locked: true });
  },

  unlock() {
    set({ locked: false });
  },

  async withAutoLockSuspended(task) {
    set((s) => ({ autoLockSuspended: s.autoLockSuspended + 1 }));
    try {
      return await task();
    } finally {
      set((s) => ({ autoLockSuspended: s.autoLockSuspended - 1 }));
    }
  },

  async restoreBackup(contents) {
    const r = requireRepo();
    await r.replaceLogs(contents.logs);
    const current = get().settings;
    // Keep this device's lock settings; everything else comes from the backup.
    const settings: Settings = {
      ...current,
      ...contents.settings,
      onboarded: true,
      lockEnabled: current.lockEnabled,
      biometricsEnabled: current.biometricsEnabled,
      disguiseEnabled: current.disguiseEnabled,
      wipeAfterFailedAttempts: current.wipeAfterFailedAttempts,
    };
    await r.setValue(KEYS.settings, settings);
    set({ logs: Object.fromEntries(contents.logs.map((l) => [l.date, l])), settings });
  },

  async eraseEverything() {
    await cancelAllReminders().catch(() => {});
    if (repo) await repo.destroy().catch(() => {});
    else await destroyDatabase().catch(() => {});
    repo = null;
    await clearPin().catch(() => {});
    set({ ...initialState });
    await get().init();
  },
}));
