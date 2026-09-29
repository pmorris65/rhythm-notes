import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';

import type { Settings } from '../domain/settings';
import type { DayLog } from '../domain/types';
import { sanitizeLogs, sanitizeSettings } from '../domain/validate';
import { decodeUtf8, encodeUtf8 } from './utf8';

/**
 * Encrypted backup files.
 *
 * The file is JSON, but everything except the parameters needed to decrypt it
 * is encrypted with XChaCha20-Poly1305 using a key derived from the user's
 * backup password with scrypt. Without the password the file reveals nothing
 * about what's inside, not even which app made it.
 */

export const BACKUP_FORMAT = 'rn-backup';
export const BACKUP_VERSION = 1;
export const MIN_PASSWORD_LENGTH = 6;

/** Settings that belong to this device and are never restored from a backup. */
const DEVICE_ONLY_SETTINGS = [
  'onboarded',
  'lockEnabled',
  'biometricsEnabled',
  'disguiseEnabled',
  'wipeAfterFailedAttempts',
] as const satisfies readonly (keyof Settings)[];

export type BackupSettings = Omit<Settings, (typeof DEVICE_ONLY_SETTINGS)[number]>;

export interface BackupContents {
  exportedAt: string;
  logs: DayLog[];
  settings: BackupSettings;
}

interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  kdf: { name: 'scrypt'; N: number; r: number; p: number; salt: string };
  cipher: 'xchacha20poly1305';
  nonce: string;
  data: string;
}

export class BackupError extends Error {
  constructor(
    readonly reason: 'invalid-file' | 'wrong-password' | 'unsupported-version',
    message: string,
  ) {
    super(message);
    this.name = 'BackupError';
  }
}

export type RandomBytes = (length: number) => Uint8Array;

const KDF = { N: 2 ** 15, r: 8, p: 1 };

function deriveKey(password: string, salt: Uint8Array, params: { N: number; r: number; p: number }) {
  return scryptAsync(encodeUtf8(password), salt, { ...params, dkLen: 32 });
}

export function backupSettings(settings: Settings): BackupSettings {
  const copy: Partial<Settings> = { ...settings };
  for (const key of DEVICE_ONLY_SETTINGS) delete copy[key];
  return copy as BackupSettings;
}

export async function encryptBackup(
  contents: BackupContents,
  password: string,
  randomBytes: RandomBytes,
): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  const salt = randomBytes(16);
  const nonce = randomBytes(24);
  const key = await deriveKey(password, salt, KDF);
  const plaintext = encodeUtf8(JSON.stringify(contents));
  const ciphertext = xchacha20poly1305(key, nonce).encrypt(plaintext);
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    kdf: { name: 'scrypt', ...KDF, salt: bytesToHex(salt) },
    cipher: 'xchacha20poly1305',
    nonce: bytesToHex(nonce),
    data: bytesToHex(ciphertext),
  };
  return JSON.stringify(file);
}

function parseFile(text: string): BackupFile {
  let file: BackupFile;
  try {
    file = JSON.parse(text);
  } catch {
    throw new BackupError('invalid-file', "This file isn't a Rhythm Notes backup.");
  }
  if (!file || file.format !== BACKUP_FORMAT) {
    throw new BackupError('invalid-file', "This file isn't a Rhythm Notes backup.");
  }
  if (file.version !== BACKUP_VERSION) {
    throw new BackupError('unsupported-version', 'This backup was made by a newer version of the app.');
  }
  const { kdf } = file;
  const hex = /^[0-9a-f]*$/;
  const valid =
    kdf?.name === 'scrypt' &&
    Number.isInteger(kdf.N) &&
    kdf.N >= 2 ** 10 &&
    kdf.N <= 2 ** 20 &&
    (kdf.N & (kdf.N - 1)) === 0 &&
    Number.isInteger(kdf.r) &&
    kdf.r >= 1 &&
    kdf.r <= 16 &&
    Number.isInteger(kdf.p) &&
    kdf.p >= 1 &&
    kdf.p <= 4 &&
    typeof kdf.salt === 'string' &&
    hex.test(kdf.salt) &&
    file.cipher === 'xchacha20poly1305' &&
    typeof file.nonce === 'string' &&
    file.nonce.length === 48 &&
    hex.test(file.nonce) &&
    typeof file.data === 'string' &&
    file.data.length % 2 === 0 &&
    hex.test(file.data);
  if (!valid) throw new BackupError('invalid-file', 'This backup file is damaged.');
  return file;
}

export async function decryptBackup(text: string, password: string): Promise<BackupContents> {
  const file = parseFile(text);
  const key = await deriveKey(password, hexToBytes(file.kdf.salt), file.kdf);
  let plaintext: Uint8Array;
  try {
    plaintext = xchacha20poly1305(key, hexToBytes(file.nonce)).decrypt(hexToBytes(file.data));
  } catch {
    throw new BackupError('wrong-password', "That password doesn't match this backup.");
  }
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(decodeUtf8(plaintext));
  } catch {
    throw new BackupError('invalid-file', 'This backup file is damaged.');
  }
  return {
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    logs: sanitizeLogs(raw.logs),
    settings: backupSettings(sanitizeSettings(raw.settings)),
  };
}
