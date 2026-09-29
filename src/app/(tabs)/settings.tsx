import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { MAX_FAILED_ATTEMPTS } from '../../domain/settings';
import { useStore } from '../../state/store';
import { useLabels } from '../../state/useLabels';
import { Body, Row, Screen, Section, Segmented, Stepper, SwitchRow } from '../../ui/components';
import { confirm, notify } from '../../ui/confirm';
import { spacing } from '../../ui/theme';

function useBiometricsAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
      .then(([hardware, enrolled]) => setAvailable(hardware && enrolled))
      .catch(() => setAvailable(false));
  }, []);
  return available;
}

export default function SettingsScreen() {
  const labels = useLabels();
  const settings = useStore((s) => s.settings);
  const encrypted = useStore((s) => s.encrypted);
  const updateSettings = useStore((s) => s.updateSettings);
  const disableLock = useStore((s) => s.disableLock);
  const lock = useStore((s) => s.lock);
  const eraseEverything = useStore((s) => s.eraseEverything);
  const withAutoLockSuspended = useStore((s) => s.withAutoLockSuspended);
  const biometricsAvailable = useBiometricsAvailable();

  const toggleLock = async (on: boolean) => {
    if (on) {
      router.push('/set-pin');
      return;
    }
    if (await confirm('Turn off the lock?', 'Anyone with your phone will be able to open the app.', 'Turn off')) {
      await disableLock();
    }
  };

  const toggleBiometrics = async (on: boolean) => {
    if (!on) return updateSettings({ biometricsEnabled: false });
    const result = await withAutoLockSuspended(() =>
      LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm to turn on',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel',
      }),
    );
    if (result.success) await updateSettings({ biometricsEnabled: true });
  };

  const toggleDisguise = async (on: boolean) => {
    await updateSettings({ disguiseEnabled: on });
    if (on) {
      notify(
        'Disguise is on',
        'When locked, the app shows a plain notes page. Press and hold the word "Notes" at the top to get to the PIN screen.',
      );
    }
  };

  const toggleWipe = async (on: boolean) => {
    if (
      !on ||
      (await confirm(
        'Erase after wrong PINs?',
        `If someone enters a wrong PIN ${MAX_FAILED_ATTEMPTS} times in a row, everything will be erased. This can't be undone.`,
        'Turn on',
        true,
      ))
    ) {
      await updateSettings({ wipeAfterFailedAttempts: on });
    }
  };

  const erase = async () => {
    const sure = await confirm(
      'Erase everything?',
      'All notes, settings and your PIN will be permanently deleted from this device. This cannot be undone.',
      'Erase',
      true,
    );
    if (sure) await eraseEverything();
  };

  return (
    <Screen title="Settings">
      <Section
        title="Privacy"
        footer="The app's screen is hidden in the app switcher. On Android, screenshots are blocked."
      >
        <SwitchRow title="App lock" detail="Ask for a PIN when opening" value={settings.lockEnabled} onValueChange={toggleLock} last={!settings.lockEnabled} />
        {settings.lockEnabled ? (
          <>
            <Row title="Change PIN" onPress={() => router.push({ pathname: '/set-pin', params: { mode: 'change' } })} />
            {biometricsAvailable ? (
              <SwitchRow title="Unlock with Face ID / fingerprint" value={settings.biometricsEnabled} onValueChange={toggleBiometrics} />
            ) : null}
            <SwitchRow
              title="Disguise lock screen"
              detail='Show a plain notes page. Hold "Notes" to unlock.'
              value={settings.disguiseEnabled}
              onValueChange={toggleDisguise}
            />
            <SwitchRow
              title={`Erase after ${MAX_FAILED_ATTEMPTS} wrong PINs`}
              value={settings.wipeAfterFailedAttempts}
              onValueChange={toggleWipe}
            />
            <Row title="Lock now" onPress={lock} last />
          </>
        ) : null}
      </Section>

      <Section title="Wording" footer="Neutral wording avoids words that reveal what the app is for.">
        <View style={styles.padded}>
          <Segmented
            options={[
              { value: 'neutral', label: 'Neutral' },
              { value: 'explicit', label: 'Explicit' },
            ]}
            value={settings.vocabulary}
            onChange={(vocabulary) => updateSettings({ vocabulary })}
          />
        </View>
      </Section>

      <Section title="Predictions" footer={`Your usual lengths are used until you've logged enough ${labels.periods.toLowerCase()}. Predictions are estimates and must not be used as contraception.`}>
        <Row
          title={`${labels.cycle} length`}
          right={
            <Stepper
              label={`${labels.cycleLower} length`}
              value={settings.defaultCycleLength}
              min={15}
              max={60}
              format={(n) => `${n} d`}
              onChange={(n) => updateSettings({ defaultCycleLength: n })}
            />
          }
        />
        <Row
          title={`${labels.period} length`}
          right={
            <Stepper
              label={`${labels.periodLower} length`}
              value={settings.defaultPeriodLength}
              min={1}
              max={14}
              format={(n) => `${n} d`}
              onChange={(n) => updateSettings({ defaultPeriodLength: n })}
            />
          }
        />
        <SwitchRow
          title={`Show ${labels.fertileWindow.toLowerCase()}`}
          detail="Estimated from your predictions"
          value={settings.showFertileWindow}
          onValueChange={(showFertileWindow) => updateSettings({ showFertileWindow })}
          last
        />
      </Section>

      <Section>
        <Row title="Reminders" onPress={() => router.push('/reminders')} />
        <Row title="Backup and restore" onPress={() => router.push('/backup')} last />
      </Section>

      <Section
        title="Your data"
        footer="Rhythm Notes has no account, no servers, no analytics and no ads. Nothing you log leaves this device unless you export a backup."
      >
        <Row
          title="Storage"
          detail={encrypted ? 'Encrypted on this device' : 'Not encrypted in this build (preview or Expo Go)'}
        />
        <Row title="Erase everything" destructive onPress={erase} last />
      </Section>

      <Body muted style={styles.version}>{`Rhythm Notes ${Constants.expoConfig?.version ?? ''}`}</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { padding: spacing.md },
  version: { textAlign: 'center', fontSize: 13 },
});
