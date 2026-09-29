import { StyleSheet, Text, View } from 'react-native';

import { formatShort } from '../../domain/dates';
import { cycleStats, PHASES, symptomInsights } from '../../domain/insights';
import { useCycleData } from '../../state/useCycleData';
import { useLabels } from '../../state/useLabels';
import { symptomLabel } from '../../vocabulary';
import { Body, Card, Label, Screen } from '../../ui/components';
import { radius, spacing, useColors } from '../../ui/theme';

export default function InsightsScreen() {
  const c = useColors();
  const labels = useLabels();
  const { periods, logs } = useCycleData();
  const stats = cycleStats(periods);
  const symptoms = symptomInsights(logs, periods);
  const maxLength = Math.max(35, ...stats.history.map((h) => h.length ?? 0));

  return (
    <Screen title="Insights">
      <View style={styles.tiles}>
        <Tile label={`Average ${labels.cycleLower}`} value={stats.averageCycle} unit="days" />
        <Tile label={`Average ${labels.periodLower}`} value={stats.averagePeriod} unit="days" />
        <Tile label="Shortest" value={stats.shortestCycle} unit="days" />
        <Tile label="Longest" value={stats.longestCycle} unit="days" />
      </View>

      {stats.completedCycles < 2 ? (
        <Card>
          <Body muted>{`Insights get more useful after you've logged a few ${labels.periods.toLowerCase()}.`}</Body>
        </Card>
      ) : null}

      {stats.history.length > 0 ? (
        <Card>
          <Label>HISTORY</Label>
          {stats.history.slice(0, 12).map((cycle) => (
            <View key={cycle.start} style={styles.historyRow}>
              <Text style={[styles.historyDate, { color: c.text }]}>{formatShort(cycle.start)}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { backgroundColor: c.accentSoft, width: `${((cycle.length ?? 0) / maxLength) * 100}%` },
                  ]}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        backgroundColor: c.accent,
                        width: cycle.length ? `${(cycle.periodLength / cycle.length) * 100}%` : 0,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.historyValue, { color: c.muted }]}>
                {cycle.length ? `${cycle.length} d` : 'now'}
              </Text>
            </View>
          ))}
          <Body muted style={{ fontSize: 13 }}>
            {`Each bar is one ${labels.cycleLower}; the darker part is the ${labels.periodLower}.`}
          </Body>
        </Card>
      ) : null}

      <Card>
        <Label>MOST NOTED</Label>
        {symptoms.overall.length === 0 ? (
          <Body muted>Nothing noted yet.</Body>
        ) : (
          <Body>{symptoms.overall.map((s) => `${symptomLabel(labels, s.symptom)} (${s.count})`).join(', ')}</Body>
        )}
        {PHASES.map((phase) =>
          symptoms.byPhase[phase].length ? (
            <View key={phase} style={{ gap: 2 }}>
              <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>{labels.phases[phase]}</Text>
              <Body>{symptoms.byPhase[phase].map((s) => symptomLabel(labels, s.symptom)).join(', ')}</Body>
            </View>
          ) : null,
        )}
      </Card>
    </Screen>
  );
}

function Tile({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  const c = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={{ color: c.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 24, fontWeight: '700' }}>
        {value ?? '–'}
        {value !== null ? <Text style={{ color: c.muted, fontSize: 14, fontWeight: '400' }}>{` ${unit}`}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyDate: { width: 56, fontSize: 14 },
  historyValue: { width: 44, fontSize: 13, textAlign: 'right' },
  barTrack: { flex: 1, height: 12 },
  bar: { height: 12, borderRadius: 6, overflow: 'hidden' },
});
