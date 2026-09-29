import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { withFlow, withPeriod } from '../../domain/actions';
import { diffDays, formatLong, isISODate } from '../../domain/dates';
import { BUILT_IN_SYMPTOMS, FLOWS, MOODS, emptyLog, type DayLog } from '../../domain/types';
import { useStore } from '../../state/store';
import { useCycleData } from '../../state/useCycleData';
import { useLabels } from '../../state/useLabels';
import { days, symptomLabel } from '../../vocabulary';
import { Body, Button, Card, Chip, ChipGroup, Label, Screen, SwitchRow } from '../../ui/components';
import { confirm } from '../../ui/confirm';
import { radius, spacing, useColors } from '../../ui/theme';

export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  if (!isISODate(date)) {
    return (
      <Screen edges={[]}>
        <Body>That day couldn&apos;t be found.</Body>
      </Screen>
    );
  }
  return <DayEditor date={date} />;
}

function DayEditor({ date }: { date: string }) {
  const c = useColors();
  const labels = useLabels();
  const { marks, prediction, today } = useCycleData();
  const stored = useStore((s) => s.logs[date]);
  const saveLog = useStore((s) => s.saveLog);
  const startPeriod = useStore((s) => s.startPeriod);
  const customSymptoms = useStore((s) => s.settings.customSymptoms);
  const updateSettings = useStore((s) => s.updateSettings);

  const log: DayLog = stored ?? emptyLog(date);
  const isFuture = date > today;
  const predicted = marks.predicted.get(date);
  const [note, setNote] = useState(log.note);
  const [newSymptom, setNewSymptom] = useState('');
  const noteRef = useRef(note);
  const changeNote = (text: string) => {
    noteRef.current = text;
    setNote(text);
  };

  // Save the note when leaving the screen.
  useEffect(() => {
    return () => {
      const current = useStore.getState().logs[date] ?? emptyLog(date);
      if (current.note !== noteRef.current) {
        useStore.getState().saveLog({ ...current, note: noteRef.current });
      }
    };
  }, [date]);

  const update = (next: DayLog) => saveLog({ ...next, note });

  const toggleSymptom = (s: string) => {
    const has = log.symptoms.includes(s);
    update({ ...log, symptoms: has ? log.symptoms.filter((x) => x !== s) : [...log.symptoms, s] });
  };

  const addSymptom = async () => {
    const name = newSymptom.trim().slice(0, 40);
    if (!name) return;
    const exists = [...BUILT_IN_SYMPTOMS, ...customSymptoms].some(
      (s) => symptomLabel(labels, s).toLowerCase() === name.toLowerCase(),
    );
    if (!exists) await updateSettings({ customSymptoms: [...customSymptoms, name] });
    if (!log.symptoms.includes(name)) update({ ...log, symptoms: [...log.symptoms, name] });
    setNewSymptom('');
  };

  const clearDay = async () => {
    if (await confirm('Clear this day?', 'Everything noted for this day will be removed.', 'Clear', true)) {
      changeNote('');
      await saveLog(emptyLog(date));
      router.back();
    }
  };

  const title = date === today ? 'Today' : formatLong(date);

  if (isFuture) {
    const cycle = prediction?.cycles.find((cyc) => cyc.earliestStart <= date && date <= cyc.end);
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title }} />
        <Card>
          <Label>{predicted ? labels.expected.toUpperCase() : 'UPCOMING'}</Label>
          <Body>
            {predicted === 'likely'
              ? `${labels.predicted}, in ${days(diffDays(today, date))}.`
              : predicted === 'possible'
                ? `${labels.possible}: this day is within the likely range.`
                : marks.ovulation.has(date)
                  ? `${labels.ovulation} (estimate).`
                  : marks.fertile.has(date)
                    ? `${labels.fertileWindow} (estimate).`
                    : 'Nothing expected on this day.'}
          </Body>
          {cycle ? <Body muted style={{ fontSize: 14 }}>Predictions are estimates and update as you log.</Body> : null}
          <Body muted style={{ fontSize: 14 }}>You can add notes once the day arrives.</Body>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title }} />

      {predicted && !log.period ? (
        <Card style={{ backgroundColor: c.accentSoft, borderColor: c.accent }}>
          <Label style={{ color: c.accent }}>{labels.expected.toUpperCase()}</Label>
          <Body>{`${labels.predicted} around this day.`}</Body>
          <Button title={date === today ? labels.started : 'Started on this day'} onPress={() => startPeriod(date)} />
        </Card>
      ) : null}

      <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>
        <SwitchRow
          title={`${labels.period} day`}
          value={log.period}
          onValueChange={(v) => update(withPeriod(log, date, v))}
          last
        />
      </View>

      <Card>
        <Label>{labels.flow.toUpperCase()}</Label>
        <ChipGroup>
          {FLOWS.map((f) => (
            <Chip
              key={f}
              label={labels.flows[f]}
              selected={log.flow === f}
              onPress={() => update(withFlow(log, log.flow === f ? null : f))}
            />
          ))}
        </ChipGroup>
      </Card>

      <Card>
        <Label>HOW YOU FEEL</Label>
        <ChipGroup>
          {[...BUILT_IN_SYMPTOMS, ...customSymptoms, ...log.symptoms.filter(
            (s) => !(BUILT_IN_SYMPTOMS as readonly string[]).includes(s) && !customSymptoms.includes(s),
          )].map((s) => (
            <Chip key={s} label={symptomLabel(labels, s)} selected={log.symptoms.includes(s)} onPress={() => toggleSymptom(s)} />
          ))}
        </ChipGroup>
        <View style={styles.addRow}>
          <TextInput
            value={newSymptom}
            onChangeText={setNewSymptom}
            onSubmitEditing={addSymptom}
            placeholder="Add your own…"
            placeholderTextColor={c.muted}
            returnKeyType="done"
            maxLength={40}
            style={[styles.input, { flex: 1, color: c.text, borderColor: c.border, backgroundColor: c.background }]}
          />
          <Button title="Add" kind="secondary" onPress={addSymptom} disabled={!newSymptom.trim()} />
        </View>
      </Card>

      <Card>
        <Label>MOOD</Label>
        <ChipGroup>
          {MOODS.map((m) => (
            <Chip
              key={m}
              label={labels.moods[m]}
              selected={log.mood === m}
              onPress={() => update({ ...log, mood: log.mood === m ? null : m })}
            />
          ))}
        </ChipGroup>
      </Card>

      <Card>
        <Label>NOTE</Label>
        <TextInput
          value={note}
          onChangeText={changeNote}
          onBlur={() => note !== log.note && saveLog({ ...log, note })}
          multiline
          placeholder="Anything else…"
          placeholderTextColor={c.muted}
          maxLength={5000}
          style={[styles.input, styles.note, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
          textAlignVertical="top"
        />
      </Card>

      {stored ? <Button title="Clear this day" kind="danger" onPress={clearDay} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  addRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 16 },
  note: { minHeight: 110 },
});
