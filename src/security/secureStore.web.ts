/**
 * Web preview only: browsers have no keychain, so secrets are kept in
 * sessionStorage. The web build is for development and is not a shipping target.
 */
const PREFIX = 'rn.secret.';

function storage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

const fallback = new Map<string, string>();

export async function getSecret(key: string): Promise<string | null> {
  const s = storage();
  return s ? s.getItem(PREFIX + key) : (fallback.get(key) ?? null);
}

export async function setSecret(key: string, value: string): Promise<void> {
  const s = storage();
  if (s) s.setItem(PREFIX + key, value);
  else fallback.set(key, value);
}

export async function deleteSecret(key: string): Promise<void> {
  const s = storage();
  if (s) s.removeItem(PREFIX + key);
  else fallback.delete(key);
}
