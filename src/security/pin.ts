import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { getRandomBytes } from 'expo-crypto';

import { encodeUtf8 } from './utf8';
import { deleteSecret, getSecret, setSecret } from './secureStore';

const PIN_KEY = 'rn.pin';
const FAILED_KEY = 'rn.failedAttempts';
const ITERATIONS = 20_000;

export const PIN_LENGTH = 4;
export const MAX_PIN_LENGTH = 8;

interface StoredPin {
  salt: string;
  hash: string;
  iterations: number;
}

async function hashPin(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  return bytesToHex(await pbkdf2Async(sha256, encodeUtf8(pin), salt, { c: iterations, dkLen: 32 }));
}

export async function hasPin(): Promise<boolean> {
  return (await getSecret(PIN_KEY)) !== null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = getRandomBytes(16);
  const stored: StoredPin = {
    salt: bytesToHex(salt),
    hash: await hashPin(pin, salt, ITERATIONS),
    iterations: ITERATIONS,
  };
  await setSecret(PIN_KEY, JSON.stringify(stored));
  await setSecret(FAILED_KEY, '0');
}

export async function verifyPin(pin: string): Promise<boolean> {
  const raw = await getSecret(PIN_KEY);
  if (!raw) return false;
  const stored = JSON.parse(raw) as StoredPin;
  const hash = await hashPin(pin, hexToBytes(stored.salt), stored.iterations);
  return hash === stored.hash;
}

export async function clearPin(): Promise<void> {
  await deleteSecret(PIN_KEY);
  await deleteSecret(FAILED_KEY);
}

export async function getFailedAttempts(): Promise<number> {
  return Number((await getSecret(FAILED_KEY)) ?? 0) || 0;
}

export async function setFailedAttempts(count: number): Promise<void> {
  await setSecret(FAILED_KEY, String(count));
}
