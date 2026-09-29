import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { verifyPin } from '../security/pin';
import { useStore } from '../state/store';
import { Screen } from '../ui/components';
import { PinPad } from '../ui/PinPad';
import { PinSetup } from '../ui/PinSetup';
import { spacing } from '../ui/theme';

/** Sets a new PIN, or changes it (after checking the current one). */
export default function SetPinScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const enableLock = useStore((s) => s.enableLock);
  const [verified, setVerified] = useState(mode !== 'change');
  const [message, setMessage] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const checkCurrent = async (pin: string) => {
    if (await verifyPin(pin)) {
      setVerified(true);
    } else {
      setMessage('Wrong PIN. Try again.');
      setResetKey((k) => k + 1);
    }
  };

  return (
    <Screen edges={['bottom']} scroll={false}>
      <View style={styles.center}>
        {verified ? (
          <PinSetup
            onDone={async (pin) => {
              await enableLock(pin);
              router.back();
            }}
          />
        ) : (
          <PinPad prompt="Enter current PIN" message={message} onComplete={checkCurrent} resetKey={resetKey} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingBottom: spacing.xxl },
});
