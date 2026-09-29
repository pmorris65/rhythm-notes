import { getRandomBytes } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TextInput, View } from 'react-native';

import {
  BackupError,
  MIN_PASSWORD_LENGTH,
  backupSettings,
  decryptBackup,
  encryptBackup,
  type BackupContents,
} from '../security/backup';
import { useStore } from '../state/store';
import { useLabels } from '../state/useLabels';
import { Body, Button, Card, Label, Screen } from '../ui/components';
import { confirm, notify } from '../ui/confirm';
import { radius, spacing, useColors } from '../ui/theme';

const isWeb = Platform.OS === 'web';

export default function BackupScreen() {
  return (
    <Screen edges={['bottom']}>
      <Body muted>
        Backups are encrypted with a password you choose. Keep the password somewhere safe: without it the backup
        can&apos;t be opened by anyone, including you.
      </Body>
      {isWeb ? (
        <Card>
          <Body muted>Backups are available in the phone app, not the web preview.</Body>
        </Card>
      ) : (
        <>
          <ExportCard />
          <ImportCard />
        </>
      )}
    </Screen>
  );
}

function PasswordInput(props: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  const c = useColors();
  return (
    <TextInput
      {...props}
      accessibilityLabel={props.placeholder}
      secureTextEntry
      autoCapitalize="none"
      autoCorrect={false}
      placeholderTextColor={c.muted}
      style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
    />
  );
}

function ExportCard() {
  const logs = useStore((s) => s.logs);
  const settings = useStore((s) => s.settings);
  const today = useStore((s) => s.today);
  const withAutoLockSuspended = useStore((s) => s.withAutoLockSuspended);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);

  const tooShort = password.length < MIN_PASSWORD_LENGTH;
  const mismatch = again.length > 0 && again !== password;

  const exportBackup = async () => {
    setBusy(true);
    let file: File | null = null;
    try {
      const contents: BackupContents = {
        exportedAt: new Date().toISOString(),
        logs: Object.values(logs),
        settings: backupSettings(settings),
      };
      const text = await encryptBackup(contents, password, getRandomBytes);
      // A plain file name that doesn't say what's inside.
      file = new File(Paths.cache, `notes-${today}.rnb`);
      if (file.exists) file.delete();
      file.create();
      file.write(text);
      await withAutoLockSuspended(() =>
        Sharing.shareAsync(file!.uri, { mimeType: 'application/octet-stream', UTI: 'public.data', dialogTitle: 'Save backup' }),
      );
      setPassword('');
      setAgain('');
    } catch (error) {
      notify('Backup failed', (error as Error).message);
    } finally {
      try {
        if (file?.exists) file.delete();
      } catch {
        // The cache is cleared by the system eventually anyway.
      }
      setBusy(false);
    }
  };

  return (
    <Card>
      <Label>CREATE A BACKUP</Label>
      <PasswordInput value={password} onChangeText={setPassword} placeholder={`Password (at least ${MIN_PASSWORD_LENGTH} characters)`} />
      <PasswordInput value={again} onChangeText={setAgain} placeholder="Password again" />
      {mismatch ? <Body muted>Passwords don&apos;t match.</Body> : null}
      {busy ? <ActivityIndicator /> : null}
      <Button
        title="Create backup file"
        onPress={exportBackup}
        disabled={busy || tooShort || again !== password}
      />
      <Body muted style={{ fontSize: 13 }}>You choose where to save it, e.g. Files, a USB drive, or a message to yourself.</Body>
    </Card>
  );
}

function ImportCard() {
  const labels = useLabels();
  const restoreBackup = useStore((s) => s.restoreBackup);
  const withAutoLockSuspended = useStore((s) => s.withAutoLockSuspended);
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    try {
      const result = await withAutoLockSuspended(() => File.pickFileAsync());
      if (result.canceled) return;
      setFileText(await result.result.text());
      setFileName(result.result.name);
    } catch (error) {
      notify("Couldn't open the file", (error as Error).message);
    }
  };

  const restore = async () => {
    if (!fileText) return;
    setBusy(true);
    try {
      const contents = await decryptBackup(fileText, password);
      const count = contents.logs.length;
      const ok = await confirm(
        'Restore this backup?',
        `It has ${count} ${count === 1 ? 'day' : 'days'} of notes. Everything currently in the app will be replaced.`,
        'Restore',
        true,
      );
      if (!ok) return;
      await restoreBackup(contents);
      setFileText(null);
      setPassword('');
      notify('Restored', `Your notes and ${labels.periods.toLowerCase()} are back.`);
    } catch (error) {
      notify(
        "Couldn't restore",
        error instanceof BackupError ? error.message : 'Something went wrong reading this backup.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Label>RESTORE A BACKUP</Label>
      <Button title={fileText ? `Chosen: ${fileName}` : 'Choose backup file'} kind="secondary" onPress={pick} />
      {fileText ? (
        <View style={{ gap: spacing.md }}>
          <PasswordInput value={password} onChangeText={setPassword} placeholder="Backup password" />
          {busy ? <ActivityIndicator /> : null}
          <Button title="Restore" onPress={restore} disabled={busy || !password} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 16 },
});
