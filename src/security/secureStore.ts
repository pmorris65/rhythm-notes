import * as SecureStore from 'expo-secure-store';

/**
 * Small secrets (the database key, the PIN hash) live in the iOS Keychain /
 * Android Keystore. "This device only" keeps them out of cloud backups and
 * device-to-device transfers, so a copied database file can't be opened.
 */
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export function getSecret(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, options);
}

export function setSecret(key: string, value: string): Promise<void> {
  return SecureStore.setItemAsync(key, value, options);
}

export function deleteSecret(key: string): Promise<void> {
  return SecureStore.deleteItemAsync(key, options);
}
