import { createMemoryRepository, type MemorySnapshot } from './memoryRepository';
import type { Repository } from './repository';

/**
 * Web preview only. Data is kept in localStorage, unencrypted, so the app can
 * be tried in a browser during development. The web build is not a shipping target.
 */
const STORAGE_KEY = 'rn.preview';

export class DatabaseUnreadableError extends Error {}

function read(): MemorySnapshot | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MemorySnapshot) : null;
  } catch {
    return null;
  }
}

function write(snapshot: MemorySnapshot | null) {
  try {
    if (snapshot) globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    else globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable (private mode); the preview still works in memory.
  }
}

export async function openRepository(): Promise<Repository> {
  return createMemoryRepository(read(), write);
}

export async function destroyDatabase(): Promise<void> {
  write(null);
}
