import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PIN_LENGTH } from '../security/pin';
import { radius, spacing, useColors } from './theme';

interface PinPadProps {
  prompt: string;
  message?: string | null;
  onComplete: (pin: string) => void;
  /** Change this to clear the entered digits. */
  resetKey?: number;
  busy?: boolean;
  extraAction?: { label: string; onPress: () => void };
}

/** Number pad for entering a PIN. Calls `onComplete` once PIN_LENGTH digits are entered. */
export function PinPad({ resetKey, ...props }: PinPadProps) {
  return <Pad key={resetKey} {...props} />;
}

function Pad({ prompt, message, onComplete, busy, extraAction }: Omit<PinPadProps, 'resetKey'>) {
  const c = useColors();
  const [pin, setPin] = useState('');

  const press = (digit: string) => {
    if (busy || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) onComplete(next);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.prompt, { color: c.text }]} accessibilityRole="header">
        {prompt}
      </Text>
      <View style={styles.dots} accessibilityLabel={`${pin.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[styles.dot, { borderColor: c.text, backgroundColor: i < pin.length ? c.text : 'transparent' }]}
          />
        ))}
      </View>
      <Text style={[styles.message, { color: c.danger }]} accessibilityLiveRegion="polite">
        {message ?? ' '}
      </Text>
      <View style={styles.grid}>
        {keys.map((k) => (
          <Key key={k} label={k} onPress={() => press(k)} />
        ))}
        {extraAction ? (
          <Key label={extraAction.label} small onPress={extraAction.onPress} />
        ) : (
          <View style={styles.key} />
        )}
        <Key label="0" onPress={() => press('0')} />
        <Key label="⌫" a11y="Delete" onPress={() => setPin((p) => p.slice(0, -1))} />
      </View>
    </View>
  );
}

function Key({ label, onPress, a11y, small }: { label: string; onPress: () => void; a11y?: string; small?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.key, { backgroundColor: pressed ? c.border : small ? 'transparent' : c.surfaceAlt }]}
    >
      <Text style={{ color: small ? c.accent : c.text, fontSize: small ? 14 : 26, fontWeight: small ? '600' : '400' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md },
  prompt: { fontSize: 20, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  message: { fontSize: 14, minHeight: 20, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 270, justifyContent: 'space-between', rowGap: spacing.md },
  key: { width: 76, height: 76, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
