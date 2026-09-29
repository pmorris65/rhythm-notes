import { bytesToHex } from '@noble/hashes/utils.js';
import { getRandomBytes } from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

import type { DayLog, Flow, Mood } from '../domain/types';
import { deleteSecret, getSecret, setSecret } from '../security/secureStore';
import type { Repository } from './repository';

/**
 * Encrypted on-device storage.
 *
 * The database is encrypted with SQLCipher (enabled through the expo-sqlite
 * config plugin in app.json). The 256-bit key is random and lives in the
 * device keychain, never in the database or in backups.
 *
 * SQLCipher is only compiled into development and store builds. In Expo Go,
 * `PRAGMA key` is ignored and the data is NOT encrypted; `encrypted` reports
 * which case we're in so the app can say so honestly.
 */

const DB_NAME = 'notes.db';
const KEY_NAME = 'rn.dbKey';

interface LogRow {
  date: string;
  period: number;
  flow: string | null;
  symptoms: string;
  mood: string | null;
  note: string;
}

const MIGRATIONS: string[] = [
  `CREATE TABLE day_logs (
     date TEXT PRIMARY KEY NOT NULL,
     period INTEGER NOT NULL DEFAULT 0,
     flow TEXT,
     symptoms TEXT NOT NULL DEFAULT '[]',
     mood TEXT,
     note TEXT NOT NULL DEFAULT ''
   );
   CREATE TABLE kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
];

export class DatabaseUnreadableError extends Error {
  constructor() {
    super("The saved notes couldn't be opened on this device.");
    this.name = 'DatabaseUnreadableError';
  }
}

async function getOrCreateKey(): Promise<string> {
  const existing = await getSecret(KEY_NAME);
  if (existing) return existing;
  const key = bytesToHex(getRandomBytes(32));
  await setSecret(KEY_NAME, key);
  return key;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}

function toLog(row: LogRow): DayLog {
  let symptoms: string[] = [];
  try {
    const parsed = JSON.parse(row.symptoms);
    if (Array.isArray(parsed)) symptoms = parsed.filter((s) => typeof s === 'string');
  } catch {
    // Leave symptoms empty if the stored value is somehow corrupt.
  }
  return {
    date: row.date,
    period: row.period === 1,
    flow: (row.flow as Flow | null) ?? null,
    symptoms,
    mood: (row.mood as Mood | null) ?? null,
    note: row.note ?? '',
  };
}

export async function openRepository(): Promise<Repository> {
  const key = await getOrCreateKey();
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Raw hex key: SQLCipher uses it directly instead of deriving one from a passphrase.
  await db.execAsync(`PRAGMA key = "x'${key}'"`);

  let encrypted = false;
  try {
    const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    encrypted = !!cipher?.cipher_version;
    // Reading the schema fails if the key doesn't match the file.
    await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
  } catch {
    await db.closeAsync().catch(() => {});
    throw new DatabaseUnreadableError();
  }
  await migrate(db);

  const upsert = async (log: DayLog) => {
    await db.runAsync(
      `INSERT INTO day_logs (date, period, flow, symptoms, mood, note)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         period = excluded.period, flow = excluded.flow, symptoms = excluded.symptoms,
         mood = excluded.mood, note = excluded.note`,
      log.date,
      log.period ? 1 : 0,
      log.flow,
      JSON.stringify(log.symptoms),
      log.mood,
      log.note,
    );
  };

  return {
    encrypted,
    async loadLogs() {
      const rows = await db.getAllAsync<LogRow>('SELECT * FROM day_logs ORDER BY date');
      return rows.map(toLog);
    },
    async saveLogs(logs) {
      await db.withTransactionAsync(async () => {
        for (const log of logs) await upsert(log);
      });
    },
    async deleteLogs(dates) {
      await db.withTransactionAsync(async () => {
        for (const date of dates) await db.runAsync('DELETE FROM day_logs WHERE date = ?', date);
      });
    },
    async getValue<T>(k: string) {
      const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', k);
      if (!row) return null;
      try {
        return JSON.parse(row.value) as T;
      } catch {
        return null;
      }
    },
    async setValue(k, value) {
      await db.runAsync(
        'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        k,
        JSON.stringify(value),
      );
    },
    async replaceLogs(logs) {
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM day_logs');
        for (const log of logs) await upsert(log);
      });
    },
    async destroy() {
      await db.closeAsync().catch(() => {});
      await destroyDatabase();
    },
  };
}

/** Deletes the database file and its key. Works even if the database can't be opened. */
export async function destroyDatabase(): Promise<void> {
  await SQLite.deleteDatabaseAsync(DB_NAME).catch(() => {});
  await deleteSecret(KEY_NAME);
}
