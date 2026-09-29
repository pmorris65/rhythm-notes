import { Alert, Platform } from 'react-native';

/** A yes/no dialog that works on phones and in the web preview. */
export function confirm(title: string, message: string, confirmLabel: string, destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/** A simple message dialog. */
export function notify(title: string, message: string): void {
  if (Platform.OS === 'web') globalThis.alert?.(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
