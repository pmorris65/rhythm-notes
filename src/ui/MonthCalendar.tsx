import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MONTH_NAMES, WEEKDAY_SHORT, monthGrid, parts, shiftMonth, type ISODate } from '../domain/dates';
import type { CalendarMarks } from '../domain/predictions';
import type { DayLog } from '../domain/types';
import type { Labels } from '../vocabulary';
import { radius, spacing, useColors } from './theme';

export interface MonthCalendarProps {
  year: number;
  month: number;
  onChangeMonth: (year: number, month: number) => void;
  today: ISODate;
  onSelectDay: (date: ISODate) => void;
  labels: Labels;
  logs?: Map<ISODate, DayLog>;
  marks?: CalendarMarks;
  selected?: ISODate | null;
  /** Days after today can't be chosen (used when picking a past date). */
  disableFuture?: boolean;
}

export function MonthCalendar(props: MonthCalendarProps) {
  const { year, month, onChangeMonth, today } = props;
  const c = useColors();
  const weeks = monthGrid(year, month);
  const go = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    onChangeMonth(next.year, next.month);
  };
  const t = parts(today);
  const isCurrentMonth = t.year === year && t.month === month;

  return (
    <View>
      <View style={styles.header}>
        <NavButton label="‹" a11y="Previous month" onPress={() => go(-1)} />
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Jumps to this month"
          onPress={() => onChangeMonth(t.year, t.month)}
          disabled={isCurrentMonth}
        >
          <Text style={[styles.monthTitle, { color: c.text }]} accessibilityRole="header">
            {MONTH_NAMES[month - 1]} {year}
          </Text>
        </Pressable>
        <NavButton label="›" a11y="Next month" onPress={() => go(1)} />
      </View>
      <View style={styles.week}>
        {WEEKDAY_SHORT.map((d, i) => (
          <Text key={i} style={[styles.weekday, { color: c.muted }]} importantForAccessibility="no">
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((date, di) =>
            date ? <DayCell key={date} date={date} {...props} /> : <View key={`e${di}`} style={styles.cell} />,
          )}
        </View>
      ))}
    </View>
  );
}

function NavButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.nav, { backgroundColor: c.surfaceAlt, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={{ color: c.text, fontSize: 22, lineHeight: 24 }}>{label}</Text>
    </Pressable>
  );
}

function DayCell({
  date,
  today,
  onSelectDay,
  logs,
  marks,
  selected,
  disableFuture,
  labels,
}: MonthCalendarProps & { date: ISODate }) {
  const c = useColors();
  const log = logs?.get(date);
  const isToday = date === today;
  const isPeriod = !!log?.period;
  const predicted = marks?.predicted.get(date);
  const fertile = marks?.fertile.has(date);
  const ovulation = marks?.ovulation.has(date);
  const isSelected = selected === date;
  const disabled = !!disableFuture && date > today;
  const hasDetails = !!log && (log.symptoms.length > 0 || !!log.mood || !!log.note.trim() || log.flow === 'spotting');

  const circle: object[] = [styles.circle];
  let textColor = disabled ? c.border : c.text;
  if (isPeriod || isSelected) {
    circle.push({ backgroundColor: c.accent });
    textColor = c.onAccent;
  } else if (predicted === 'likely') {
    circle.push({ borderWidth: 2, borderStyle: 'dashed', borderColor: c.accent, backgroundColor: c.accentSoft });
    textColor = c.accent;
  } else if (predicted === 'possible') {
    circle.push({ borderWidth: 1.5, borderStyle: 'dotted', borderColor: c.accent });
  } else if (ovulation) {
    circle.push({ borderWidth: 2, borderColor: c.focus, backgroundColor: c.focusSoft });
  } else if (fertile) {
    circle.push({ backgroundColor: c.focusSoft });
  }
  if (isToday && !isPeriod && !isSelected) circle.push({ borderWidth: 2, borderColor: c.text, borderStyle: 'solid' });

  const { month, day } = parts(date);
  const descriptions = [
    isToday && 'Today',
    isPeriod && labels.period,
    predicted === 'likely' && labels.predicted,
    predicted === 'possible' && labels.possible,
    ovulation && labels.ovulation,
    fertile && !ovulation && labels.fertileWindow,
    hasDetails && 'Has notes',
  ].filter(Boolean);

  return (
    <Pressable
      style={styles.cell}
      disabled={disabled}
      onPress={() => onSelectDay(date)}
      accessibilityRole="button"
      accessibilityLabel={[`${MONTH_NAMES[month - 1]} ${day}`, ...descriptions].join(', ')}
      accessibilityState={{ selected: isSelected, disabled }}
    >
      {({ pressed }) => (
        <>
          <View style={[...circle, pressed && { opacity: 0.6 }]}>
            <Text style={{ color: textColor, fontSize: 16, fontWeight: isToday ? '700' : '400' }}>{day}</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: hasDetails ? c.muted : 'transparent' }]} />
        </>
      )}
    </Pressable>
  );
}

export function CalendarLegend({ labels, showFertile }: { labels: Labels; showFertile: boolean }) {
  const c = useColors();
  const items = [
    { label: labels.period, style: { backgroundColor: c.accent } },
    {
      label: labels.predicted,
      style: { borderWidth: 2, borderStyle: 'dashed' as const, borderColor: c.accent, backgroundColor: c.accentSoft },
    },
    { label: labels.possible, style: { borderWidth: 1.5, borderStyle: 'dotted' as const, borderColor: c.accent } },
    ...(showFertile
      ? [
          { label: labels.fertileWindow, style: { backgroundColor: c.focusSoft } },
          { label: labels.ovulation, style: { borderWidth: 2, borderColor: c.focus, backgroundColor: c.focusSoft } },
        ]
      : []),
    { label: 'Has notes', style: { width: 6, height: 6, backgroundColor: c.muted, margin: 5 } },
  ];
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendSwatch, item.style]} />
          <Text style={{ color: c.muted, fontSize: 13 }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  monthTitle: { fontSize: 18, fontWeight: '600' },
  nav: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', marginBottom: spacing.xs },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  circle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 16, height: 16, borderRadius: 8 },
});
