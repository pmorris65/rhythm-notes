import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, diffDays, formatLong, formatRange, formatShort } from '../../domain/dates';
import type { DayLog } from '../../domain/types';
import { useStore } from '../../state/store';
import { useCycleData } from '../../state/useCycleData';
import { useLabels } from '../../state/useLabels';
import { days, symptomLabel, type Labels } from '../../vocabulary';
import { Body, Button, Card, Label, Screen } from '../../ui/components';
import { spacing, useColors } from '../../ui/theme';

export default function TodayScreen() {
  const c = useColors();
  const labels = useLabels();
  const { prediction, cycleDay, today, logMap } = useCycleData();
  const startPeriod = useStore((s) => s.startPeriod);
  const endPeriod = useStore((s) => s.endPeriod);
  const lock = useStore((s) => s.lock);
  const lockEnabled = useStore((s) => s.settings.lockEnabled);
  const todayLog = logMap.get(today);

  const lockButton = lockEnabled ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Lock now"
      onPress={lock}
      hitSlop={10}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: c.surfaceAlt, opacity: pressed ? 0.6 : 1 }]}
    >
      <Feather name="lock" size={18} color={c.text} />
    </Pressable>
  ) : null;

  let main;
  if (!prediction) {
    main = (
      <Card>
        <Text style={[styles.big, { color: c.text }]}>Welcome</Text>
        <Body muted>
          {`Tap below when your next ${labels.periodLower} starts, or add past ${labels.periods.toLowerCase()} from the Calendar.`}
        </Body>
        <Button title={labels.started} onPress={() => startPeriod(today)} />
      </Card>
    );
  } else if (prediction.ongoingPeriod) {
    const ongoing = prediction.ongoingPeriod;
    const day = diffDays(ongoing.start, today) + 1;
    const expectedEnd = addDays(ongoing.start, prediction.periodLength - 1);
    const yesterday = addDays(today, -1);
    main = (
      <Card>
        <Label>{labels.period.toUpperCase()}</Label>
        <Text style={[styles.big, { color: c.text }]}>{`Day ${day}`}</Text>
        <Body muted>
          {expectedEnd >= today ? `Usually lasts until about ${formatShort(expectedEnd)}.` : 'Running a little longer than usual.'}
        </Body>
        <View style={styles.buttonRow}>
          {!todayLog?.period ? (
            <Button title={labels.stillGoing} onPress={() => startPeriod(today)} style={styles.flex} />
          ) : null}
          <Button title={labels.ended} kind="secondary" onPress={() => endPeriod(ongoing.start, today)} style={styles.flex} />
        </View>
        {!todayLog?.period && yesterday >= ongoing.start ? (
          <Button title="Ended yesterday" kind="ghost" onPress={() => endPeriod(ongoing.start, yesterday)} />
        ) : null}
      </Card>
    );
  } else {
    const next = prediction.cycles[0];
    const daysUntil = diffDays(today, next.start);
    main = (
      <Card>
        {cycleDay ? <Label>{labels.dayOfCycle(cycleDay).toUpperCase()}</Label> : null}
        <Text style={[styles.big, { color: c.text }]}>
          {prediction.lateByDays > 0 ? labels.late(prediction.lateByDays) : labels.nextIn(daysUntil)}
        </Text>
        <Body muted>
          {prediction.lateByDays > 0
            ? `Was expected ${formatShort(addDays(today, -prediction.lateByDays))}.`
            : `${labels.expected} ${formatRange(next.start, next.end)}${
                next.earliestStart !== next.start || next.latestStart !== next.start
                  ? ` (could start ${formatRange(next.earliestStart, next.latestStart)})`
                  : ''
              }.`}
        </Body>
        <Button title={labels.started} onPress={() => startPeriod(today)} />
      </Card>
    );
  }

  return (
    <Screen title="Today" subtitle={formatLong(today)} right={lockButton}>
      {main}

      <Card>
        <Label>TODAY&apos;S NOTE</Label>
        <TodaySummary log={todayLog} labels={labels} />
        <Button
          title={todayLog ? 'Edit today' : 'Add to today'}
          kind="secondary"
          onPress={() => router.push({ pathname: '/day/[date]', params: { date: today } })}
        />
      </Card>

      {prediction ? (
        <Card>
          <Label>COMING UP</Label>
          {prediction.cycles.slice(0, 3).map((cyc) => (
            <View key={cyc.index} style={styles.upcoming}>
              <Body>{formatRange(cyc.start, cyc.end)}</Body>
              <Body muted style={{ fontSize: 14 }}>
                {cyc.earliestStart === cyc.latestStart ? '' : `± ${days(diffDays(cyc.start, cyc.latestStart))}`}
              </Body>
            </View>
          ))}
          <Body muted style={{ fontSize: 13 }}>
            {prediction.basedOnCycles >= 1
              ? `Based on your last ${prediction.basedOnCycles} ${labels.cycleLower}${prediction.basedOnCycles === 1 ? '' : 's'}${
                  prediction.irregular ? ', which vary quite a bit' : ''
                }. These are estimates.`
              : `Based on your usual ${labels.cycleLower} length until you've logged a couple of ${labels.periods.toLowerCase()}. These are estimates.`}
          </Body>
        </Card>
      ) : null}
    </Screen>
  );
}

function TodaySummary({ log, labels }: { log: DayLog | undefined; labels: Labels }) {
  if (!log) return <Body muted>Nothing noted yet.</Body>;
  const parts = [
    log.period && labels.period,
    log.flow && `${labels.flow}: ${labels.flows[log.flow]}`,
    log.mood && `Mood: ${labels.moods[log.mood]}`,
    log.symptoms.length > 0 && log.symptoms.map((s) => symptomLabel(labels, s)).join(', '),
  ].filter(Boolean);
  return (
    <View style={{ gap: spacing.xs }}>
      {parts.length ? <Body>{parts.join(' · ')}</Body> : null}
      {log.note.trim() ? (
        <Body muted numberOfLines={3}>
          {log.note.trim()}
        </Body>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  upcoming: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
