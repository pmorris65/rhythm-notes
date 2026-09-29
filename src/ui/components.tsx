import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { radius, spacing, useColors } from './theme';

export function Screen({
  title,
  subtitle,
  right,
  children,
  scroll = true,
  edges = ['top'],
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
}) {
  const c = useColors();
  const header = title ? (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.text }]} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={[styles.subtitle, { color: c.muted }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  ) : null;
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: c.background }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</View>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.label, { color: c.muted }, style]}>{children}</Text>;
}

export function Body({
  children,
  style,
  muted,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <Text numberOfLines={numberOfLines} style={[styles.body, { color: muted ? c.muted : c.text }, style]}>
      {children}
    </Text>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  style,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const c = useColors();
  const bg = { primary: c.accent, secondary: c.surfaceAlt, ghost: 'transparent', danger: c.warningSoft }[kind];
  const fg = { primary: c.onAccent, secondary: c.text, ghost: c.accent, danger: c.danger }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? c.accent : c.surface,
          borderColor: selected ? c.accent : c.border,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={{ color: selected ? c.onAccent : c.text, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={styles.chipGroup}>{children}</View>;
}

export function Section({ title, children, footer }: { title?: string; children: ReactNode; footer?: string }) {
  const c = useColors();
  return (
    <View style={styles.section}>
      {title ? <Label style={styles.sectionTitle}>{title.toUpperCase()}</Label> : null}
      <View style={[styles.sectionBody, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>
      {footer ? <Text style={[styles.footer, { color: c.muted }]}>{footer}</Text> : null}
    </View>
  );
}

export function Row({
  title,
  detail,
  onPress,
  right,
  destructive,
  last,
}: {
  title: string;
  detail?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  last?: boolean;
}) {
  const c = useColors();
  const content = (
    <View style={[styles.row, !last && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: destructive ? c.danger : c.text, fontSize: 16 }}>{title}</Text>
        {detail ? <Text style={{ color: c.muted, fontSize: 13, marginTop: 2 }}>{detail}</Text> : null}
      </View>
      {right}
      {onPress && !right ? <Text style={{ color: c.muted, fontSize: 18 }}>›</Text> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {content}
    </Pressable>
  );
}

export function SwitchRow({
  title,
  detail,
  value,
  onValueChange,
  disabled,
  last,
}: {
  title: string;
  detail?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const c = useColors();
  return (
    <Row
      title={title}
      detail={detail}
      last={last}
      right={
        <Switch
          accessibilityLabel={title}
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ true: c.accent, false: c.border }}
          thumbColor="#FFFFFF"
        />
      }
    />
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  format = String,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  format?: (n: number) => string;
  label: string;
}) {
  const c = useColors();
  const btn = (text: string, next: number, disabled: boolean, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      disabled={disabled}
      onPress={() => onChange(next)}
      style={({ pressed }) => [
        styles.stepBtn,
        { backgroundColor: c.surfaceAlt, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={{ color: c.text, fontSize: 20 }}>{text}</Text>
    </Pressable>
  );
  return (
    <View style={styles.stepper} accessibilityLabel={`${label}: ${format(value)}`}>
      {btn('−', value - 1, value <= min, `Decrease ${label}`)}
      <Text style={{ color: c.text, fontSize: 16, minWidth: 64, textAlign: 'center' }}>{format(value)}</Text>
      {btn('+', value + 1, value >= max, `Increase ${label}`)}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: c.surfaceAlt }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { backgroundColor: c.surface }]}
          >
            <Text style={{ color: selected ? c.text : c.muted, fontWeight: selected ? '600' : '400' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 2 },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  body: { fontSize: 16, lineHeight: 22 },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { gap: spacing.sm },
  sectionTitle: { marginLeft: spacing.xs },
  sectionBody: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  footer: { fontSize: 13, marginHorizontal: spacing.xs, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    minHeight: 52,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.sm },
});
