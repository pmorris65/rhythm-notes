import * as ScreenCapture from 'expo-screen-capture';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';

import { configureNotifications, syncReminders } from '../notifications/reminders';
import { useStore } from '../state/store';
import { useCycleData } from '../state/useCycleData';
import { Body, Button, Screen } from '../ui/components';
import { confirm } from '../ui/confirm';
import { LockScreen } from '../ui/LockScreen';
import { Onboarding } from '../ui/Onboarding';
import { useColors } from '../ui/theme';

export default function RootLayout() {
  const c = useColors();
  const status = useStore((s) => s.status);
  const onboarded = useStore((s) => s.settings.onboarded);
  const locked = useStore((s) => s.locked);
  const appActive = useAppActive();

  useEffect(() => {
    configureNotifications();
    useStore.getState().init();
    // Hide the app's content in the recent-apps screen (and block screenshots on Android).
    if (Platform.OS === 'ios') ScreenCapture.enableAppSwitcherProtectionAsync(0.9).catch(() => {});
    if (Platform.OS === 'android') ScreenCapture.preventScreenCaptureAsync('privacy').catch(() => {});
  }, []);

  let content;
  if (status === 'loading') {
    content = (
      <View style={[styles.fill, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.muted} />
      </View>
    );
  } else if (status === 'unreadable' || status === 'error') {
    content = <StorageProblem unreadable={status === 'unreadable'} />;
  } else if (!onboarded) {
    content = <Onboarding />;
  } else {
    content = (
      <>
        <View
          style={styles.fill}
          accessibilityElementsHidden={locked}
          importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}
        >
          <Stack
            screenOptions={{
              headerTintColor: c.accent,
              headerStyle: { backgroundColor: c.background },
              headerTitleStyle: { color: c.text },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: c.background },
              headerBackTitle: 'Back',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
            <Stack.Screen name="day/[date]" options={{ title: '' }} />
            <Stack.Screen name="set-pin" options={{ title: 'PIN' }} />
            <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
            <Stack.Screen name="backup" options={{ title: 'Backup' }} />
          </Stack>
        </View>
        <ReminderSync />
        {locked ? <LockScreen /> : null}
      </>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <StatusBar style="auto" />
      {content}
      {/* Covers the screen whenever the app isn't in front, e.g. in the app switcher. */}
      {!appActive ? <View style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]} /> : null}
    </View>
  );
}

/** Tracks whether the app is in the foreground, locking it when it goes to the background. */
function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      const store = useStore.getState();
      if (state === 'background' && store.autoLockSuspended === 0) store.lock();
      if (state === 'active') store.refreshToday();
    });
    // Keep "today" right if the app stays open past midnight.
    const timer = setInterval(() => useStore.getState().refreshToday(), 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return active;
}

/** Keeps scheduled reminders in step with settings and the latest prediction. */
function ReminderSync() {
  const reminders = useStore((s) => s.settings.reminders);
  const settings = useStore((s) => s.settings);
  const { prediction } = useCycleData();
  const starts = prediction?.cycles.map((cyc) => cyc.start).join(',') ?? '';

  useEffect(() => {
    const timer = setTimeout(() => {
      syncReminders(settings, prediction).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
    // Only re-sync when reminder settings or predicted dates actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders, starts]);
  return null;
}

function StorageProblem({ unreadable }: { unreadable: boolean }) {
  const init = useStore((s) => s.init);
  const eraseEverything = useStore((s) => s.eraseEverything);
  return (
    <Screen title="Something went wrong">
      <Body>
        {unreadable
          ? "Your saved notes can't be opened on this device. This can happen after moving to a new phone, because the encryption key never leaves the old one. If you have a backup file, start fresh and restore it from Settings."
          : "Your notes couldn't be loaded. Please try again."}
      </Body>
      <Button title="Try again" kind="secondary" onPress={init} />
      {unreadable ? (
        <Button
          title="Start fresh"
          kind="danger"
          onPress={async () => {
            if (await confirm('Start fresh?', 'The unreadable notes will be deleted.', 'Start fresh', true)) {
              await eraseEverything();
            }
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
