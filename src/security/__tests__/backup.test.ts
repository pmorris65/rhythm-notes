import { randomBytes } from 'node:crypto';

import { DEFAULT_SETTINGS } from '../../domain/settings';
import { emptyLog } from '../../domain/types';
import { backupSettings, BackupError, decryptBackup, encryptBackup, type BackupContents } from '../backup';
import { decodeUtf8, encodeUtf8 } from '../utf8';

const rng = (n: number) => new Uint8Array(randomBytes(n));

const contents: BackupContents = {
  exportedAt: '2026-09-29T10:00:00.000Z',
  logs: [
    { ...emptyLog('2026-09-01'), period: true, flow: 'medium', symptoms: ['cramps'], note: 'Café ☕ 😀' },
    { ...emptyLog('2026-09-02'), period: true },
  ],
  settings: backupSettings({ ...DEFAULT_SETTINGS, vocabulary: 'explicit', lockEnabled: true }),
};

describe('backup', () => {
  it('round-trips with the right password', async () => {
    const file = await encryptBackup(contents, 'correct horse', rng);
    const restored = await decryptBackup(file, 'correct horse');
    expect(restored.logs).toEqual(contents.logs);
    expect(restored.settings.vocabulary).toBe('explicit');
    expect(restored.exportedAt).toBe(contents.exportedAt);
  });

  it('does not reveal any content without the password', async () => {
    const file = await encryptBackup(contents, 'correct horse', rng);
    for (const word of ['period', 'cramps', 'Café', '2026-09-01', 'explicit', 'rhythm']) {
      expect(file.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  it('rejects the wrong password', async () => {
    const file = await encryptBackup(contents, 'correct horse', rng);
    await expect(decryptBackup(file, 'wrong horse')).rejects.toMatchObject({ reason: 'wrong-password' });
  });

  it('rejects tampered data', async () => {
    const file = JSON.parse(await encryptBackup(contents, 'correct horse', rng));
    const flipped = (parseInt(file.data[0], 16) ^ 1).toString(16);
    file.data = flipped + file.data.slice(1);
    await expect(decryptBackup(JSON.stringify(file), 'correct horse')).rejects.toBeInstanceOf(BackupError);
  });

  it('rejects files that are not backups', async () => {
    await expect(decryptBackup('hello', 'pw')).rejects.toMatchObject({ reason: 'invalid-file' });
    await expect(decryptBackup('{"format":"other"}', 'pw')).rejects.toMatchObject({ reason: 'invalid-file' });
  });

  it('never restores device-only settings like the lock', () => {
    const s = backupSettings({ ...DEFAULT_SETTINGS, lockEnabled: true, disguiseEnabled: true });
    expect('lockEnabled' in s).toBe(false);
    expect('disguiseEnabled' in s).toBe(false);
    expect('onboarded' in s).toBe(false);
  });

  it('refuses short passwords', async () => {
    await expect(encryptBackup(contents, '123', rng)).rejects.toThrow();
  });
});

describe('utf8', () => {
  it('round-trips all kinds of characters', () => {
    const text = 'plain, é, 中文, emoji 😀🌙, and \u0000';
    expect(decodeUtf8(encodeUtf8(text))).toBe(text);
    expect(Array.from(encodeUtf8('é'))).toEqual([0xc3, 0xa9]);
  });
});
