import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MAX_FAILED_ATTEMPTS } from '../domain/settings';
import { getFailedAttempts, setFailedAttempts, verifyPin } from '../security/pin';
import { useStore } from '../state/store';
import { PinPad } from './PinPad';
import { spacing, useColors } from './theme';

/** Shown over everything while the app is locked. */
export function LockScreen() {
  const c = useColors();
  const disguise = useStore((s) => s.settings.disguiseEnabled);
  const [revealed, setRevealed] = useState(!disguise);

  return (
    <SafeAreaView style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]}>
      {revealed ? <Unlock onHide={disguise ? () => setRevealed(false) : undefined} /> : <DisguiseNotes onReveal={() => setRevealed(true)} />}
    </SafeAreaView>
  );
}

function Unlock({ onHide }: { onHide?: () => void }) {
  const c = useColors();
  const unlock = useStore((s) => s.unlock);
  const eraseEverything = useStore((s) => s.eraseEverything);
  const biometrics = useStore((s) => s.settings.biometricsEnabled);
  const wipeEnabled = useStore((s) => s.settings.wipeAfterFailedAttempts);
  const [message, setMessage] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const prompted = useRef(false);

  const tryBiometrics = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock',
        cancelLabel: 'Use PIN',
        // Require the app PIN as the fallback rather than the phone passcode.
        disableDeviceFallback: true,
      });
      if (result.success) {
        await setFailedAttempts(0);
        unlock();
      }
    } catch {
      // Fall back to the PIN pad.
    }
  }, [unlock]);

  useEffect(() => {
    if (biometrics && !prompted.current) {
      prompted.current = true;
      tryBiometrics();
    }
  }, [biometrics, tryBiometrics]);

  const onComplete = async (pin: string) => {
    setBusy(true);
    try {
      if (await verifyPin(pin)) {
        await setFailedAttempts(0);
        unlock();
        return;
      }
      const attempts = (await getFailedAttempts()) + 1;
      await setFailedAttempts(attempts);
      if (wipeEnabled && attempts >= MAX_FAILED_ATTEMPTS) {
        await eraseEverything();
        return;
      }
      const left = MAX_FAILED_ATTEMPTS - attempts;
      setMessage(wipeEnabled && left <= 3 ? `Wrong PIN. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Wrong PIN. Try again.');
      setResetKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.center}>
      {onHide ? (
        <Pressable accessibilityRole="button" onPress={onHide} style={styles.hide} hitSlop={12}>
          <Text style={{ color: c.muted }}>Cancel</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.appName, { color: c.muted }]}>Rhythm Notes</Text>
      <PinPad
        prompt="Enter PIN"
        message={message}
        onComplete={onComplete}
        resetKey={resetKey}
        busy={busy}
        extraAction={biometrics && Platform.OS !== 'web' ? { label: 'Face / Touch', onPress: tryBiometrics } : undefined}
      />
    </View>
  );
}

/**
 * The disguise: a plain, working notepad. Long-pressing the "Notes" title
 * opens the real PIN screen.
 */
function DisguiseNotes({ onReveal }: { onReveal: () => void }) {
  const c = useColors();
  const decoyNote = useStore((s) => s.decoyNote);
  const setDecoyNote = useStore((s) => s.setDecoyNote);
  const [text, setText] = useState(decoyNote);

  return (
    <View style={styles.notes}>
      <Pressable onLongPress={onReveal} delayLongPress={800} accessibilityRole="header">
        <Text style={[styles.notesTitle, { color: c.text }]}>Notes</Text>
      </Pressable>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={() => setDecoyNote(text)}
        multiline
        placeholder="Start typing…"
        placeholderTextColor={c.muted}
        style={[styles.notesInput, { color: c.text }]}
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl, padding: spacing.lg },
  appName: { fontSize: 15, letterSpacing: 0.5 },
  hide: { position: 'absolute', top: spacing.lg, right: spacing.lg },
  notes: { flex: 1, padding: spacing.lg, gap: spacing.md },
  notesTitle: { fontSize: 32, fontWeight: '700', marginTop: spacing.sm },
  notesInput: { flex: 1, fontSize: 17, lineHeight: 24 },
});
