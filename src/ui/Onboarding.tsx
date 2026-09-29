import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, dateRange, formatLong, parts, type ISODate } from '../domain/dates';
import type { Vocabulary } from '../domain/settings';
import { emptyLog } from '../domain/types';
import { useStore } from '../state/store';
import { DEFAULT_PERIOD_WORD, labelsFor } from '../vocabulary';
import { Body, Button, Card, Label, Screen, Stepper } from './components';
import { MonthCalendar } from './MonthCalendar';
import { PeriodWordPicker } from './PeriodWordPicker';
import { PinSetup } from './PinSetup';
import { spacing, useColors } from './theme';

type Step = 'welcome' | 'wording' | 'last' | 'lock';

/** First-run setup: wording, last entry, and an optional PIN. */
export function Onboarding() {
  const today = useStore((s) => s.today);
  const saveLogs = useStore((s) => s.saveLogs);
  const updateSettings = useStore((s) => s.updateSettings);
  const enableLock = useStore((s) => s.enableLock);

  const [step, setStep] = useState<Step>('welcome');
  const [vocabulary, setVocabulary] = useState<Vocabulary>('neutral');
  const [periodWord, setPeriodWord] = useState(DEFAULT_PERIOD_WORD);
  const [lastStart, setLastStart] = useState<ISODate | null>(null);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [view, setView] = useState(() => parts(today));
  const labels = labelsFor(vocabulary, periodWord);

  const finish = async (pin: string | null) => {
    if (lastStart) {
      const end = addDays(lastStart, periodLength - 1);
      const days = dateRange(lastStart, end < today ? end : today);
      await saveLogs(days.map((date) => ({ ...emptyLog(date), period: true })));
    }
    if (pin) await enableLock(pin);
    await updateSettings({
      vocabulary,
      periodWord,
      defaultCycleLength: cycleLength,
      defaultPeriodLength: periodLength,
      onboarded: true,
    });
  };

  if (step === 'welcome') {
    return (
      <Screen title="Rhythm Notes" subtitle="Private notes that stay on your phone">
        <Card>
          <Point title="Only on this device" text="No account. Nothing is uploaded, shared, or sold." />
          <Point title="Encrypted" text="Your notes are stored encrypted on your phone." />
          <Point title="Discreet" text="Plain wording, an optional PIN, and reminders that don't say what they're for." />
        </Card>
        <Button title="Get started" onPress={() => setStep('wording')} />
      </Screen>
    );
  }

  if (step === 'wording') {
    return (
      <Screen title="Choose your wording" subtitle="You can change this later in Settings.">
        <WordingOption
          title="Neutral (recommended)"
          example={`"${labelsFor('neutral', periodWord).nextIn(3)}"`}
          selected={vocabulary === 'neutral'}
          onPress={() => setVocabulary('neutral')}
        />
        {vocabulary === 'neutral' ? (
          <Card>
            <Label>WHAT SHOULD WE CALL IT?</Label>
            <Body muted>Pick a word or type your own. Only you need to know what it means.</Body>
            <PeriodWordPicker value={periodWord} onChange={setPeriodWord} />
          </Card>
        ) : null}
        <WordingOption
          title="Explicit"
          example={`"${labelsFor('explicit').nextIn(3)}"`}
          selected={vocabulary === 'explicit'}
          onPress={() => setVocabulary('explicit')}
        />
        <Button title="Continue" onPress={() => setStep('last')} />
      </Screen>
    );
  }

  if (step === 'last') {
    return (
      <Screen
        title={`Your last ${labels.periodLower}`}
        subtitle={`When did your most recent ${labels.periodLower} start? This helps with the first prediction.`}
      >
        <Card>
          <MonthCalendar
            year={view.year}
            month={view.month}
            onChangeMonth={(year, month) => setView({ year, month, day: 1 })}
            today={today}
            labels={labels}
            selected={lastStart}
            disableFuture
            onSelectDay={(d) => setLastStart(d === lastStart ? null : d)}
          />
          <Body muted>{lastStart ? `Started ${formatLong(lastStart)}` : 'Tap a day to choose it.'}</Body>
        </Card>
        <Card>
          <View style={styles.stepRow}>
            <Body style={{ flex: 1 }}>{`Usual ${labels.cycleLower} length`}</Body>
            <Stepper label={`${labels.cycleLower} length`} value={cycleLength} onChange={setCycleLength} min={15} max={60} format={(n) => `${n} days`} />
          </View>
          <View style={styles.stepRow}>
            <Body style={{ flex: 1 }}>{`Usual ${labels.periodLower} length`}</Body>
            <Stepper label={`${labels.periodLower} length`} value={periodLength} onChange={setPeriodLength} min={1} max={14} format={(n) => `${n} days`} />
          </View>
          <Body muted style={{ fontSize: 14 }}>Not sure? Leave these as they are. Predictions learn from what you log.</Body>
        </Card>
        <Button title={lastStart ? 'Continue' : "Skip, I'll log it later"} onPress={() => setStep('lock')} kind={lastStart ? 'primary' : 'secondary'} />
      </Screen>
    );
  }

  return (
    <Screen title="Protect with a PIN?" subtitle="Anyone opening the app will need it. You can turn this on later.">
      <Card style={{ paddingVertical: spacing.xl }}>
        <PinSetup onDone={(pin) => finish(pin)} />
      </Card>
      <Button title="Not now" kind="ghost" onPress={() => finish(null)} />
    </Screen>
  );
}

function Point({ title, text }: { title: string; text: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Body style={{ fontWeight: '600' }}>{title}</Body>
      <Body muted>{text}</Body>
    </View>
  );
}

function WordingOption({
  title,
  example,
  selected,
  onPress,
}: {
  title: string;
  example: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}>
      <Card style={selected ? { borderColor: c.accent, borderWidth: 2 } : undefined}>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>
          {selected ? '● ' : '○ '}
          {title}
        </Text>
        <Label>{example}</Label>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
