import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import type { ReminderSettings } from '../domain/settings';
import { requestReminderPermission } from '../notifications/reminders';
import { useStore } from '../state/store';
import { useLabels } from '../state/useLabels';
import { Body, Row, Screen, Section, Stepper, SwitchRow } from '../ui/components';
import { notify } from '../ui/confirm';
import { radius, spacing, useColors } from '../ui/theme';

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export default function RemindersScreen() {
  const c = useColors();
  const labels = useLabels();
  const reminders = useStore((s) => s.settings.reminders);
  const updateSettings = useStore((s) => s.updateSettings);
  const withAutoLockSuspended = useStore((s) => s.withAutoLockSuspended);
  const [upcomingText, setUpcomingText] = useState(reminders.upcoming.text);
  const [dailyText, setDailyText] = useState(reminders.daily.text);

  const save = (next: ReminderSettings) => updateSettings({ reminders: next });

  const enable = async (which: 'upcoming' | 'daily', on: boolean) => {
    if (on && !(await withAutoLockSuspended(requestReminderPermission))) {
      notify('Notifications are off', 'Allow notifications for Rhythm Notes in your phone settings to get reminders.');
      return;
    }
    await save({ ...reminders, [which]: { ...reminders[which], enabled: on } });
  };

  const inputStyle = [styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }];

  return (
    <Screen edges={['bottom']}>
      {Platform.OS === 'web' ? <Body muted>Reminders work in the phone app, not the web preview.</Body> : null}

      <Section
        title={`Before your next ${labels.periodLower}`}
        footer="Only this text is shown, so choose something that doesn't give anything away."
      >
        <SwitchRow title="Remind me" value={reminders.upcoming.enabled} onValueChange={(v) => enable('upcoming', v)} />
        <Row
          title="Days before"
          right={
            <Stepper
              label="days before"
              value={reminders.upcoming.daysBefore}
              min={0}
              max={7}
              format={(n) => (n === 0 ? 'Same day' : `${n} d`)}
              onChange={(daysBefore) => save({ ...reminders, upcoming: { ...reminders.upcoming, daysBefore } })}
            />
          }
        />
        <View style={styles.padded}>
          <TextInput
            accessibilityLabel="Reminder text"
            value={upcomingText}
            onChangeText={setUpcomingText}
            onBlur={() => upcomingText.trim() && save({ ...reminders, upcoming: { ...reminders.upcoming, text: upcomingText.trim() } })}
            maxLength={120}
            style={inputStyle}
          />
        </View>
      </Section>

      <Section title="Daily" footer="A gentle nudge to jot things down.">
        <SwitchRow title="Remind me daily" value={reminders.daily.enabled} onValueChange={(v) => enable('daily', v)} />
        <Row
          title="Time"
          right={
            <Stepper
              label="reminder time"
              value={reminders.daily.hour * 2 + (reminders.daily.minute >= 30 ? 1 : 0)}
              min={0}
              max={47}
              format={(n) => `${pad(Math.floor(n / 2))}:${n % 2 ? '30' : '00'}`}
              onChange={(n) =>
                save({ ...reminders, daily: { ...reminders.daily, hour: Math.floor(n / 2), minute: n % 2 ? 30 : 0 } })
              }
            />
          }
        />
        <View style={styles.padded}>
          <TextInput
            accessibilityLabel="Daily reminder text"
            value={dailyText}
            onChangeText={setDailyText}
            onBlur={() => dailyText.trim() && save({ ...reminders, daily: { ...reminders.daily, text: dailyText.trim() } })}
            maxLength={120}
            style={inputStyle}
          />
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { padding: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 16 },
});
