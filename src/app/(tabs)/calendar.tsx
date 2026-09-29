import { router } from 'expo-router';
import { useState } from 'react';

import { diffDays, formatRange, parts } from '../../domain/dates';
import { useStore } from '../../state/store';
import { useCycleData } from '../../state/useCycleData';
import { useLabels } from '../../state/useLabels';
import { days } from '../../vocabulary';
import { Body, Card, Label, Screen } from '../../ui/components';
import { CalendarLegend, MonthCalendar } from '../../ui/MonthCalendar';

function inDays(n: number) {
  return n === 0 ? 'today' : `in ${days(n)}`;
}

export default function CalendarScreen() {
  const labels = useLabels();
  const { logMap, marks, prediction, today } = useCycleData();
  const showFertile = useStore((s) => s.settings.showFertileWindow);
  const [view, setView] = useState(() => parts(today));

  const next = prediction?.cycles[0];

  return (
    <Screen title="Calendar">
      <Card>
        <MonthCalendar
          year={view.year}
          month={view.month}
          onChangeMonth={(year, month) => setView({ year, month, day: 1 })}
          today={today}
          labels={labels}
          logs={logMap}
          marks={marks}
          onSelectDay={(date) => router.push({ pathname: '/day/[date]', params: { date } })}
        />
        <CalendarLegend labels={labels} showFertile={showFertile} />
      </Card>
      {next ? (
        <Card>
          <Label>{`NEXT ${labels.period.toUpperCase()}`}</Label>
          <Body>
            {prediction.lateByDays > 0
              ? labels.late(prediction.lateByDays)
              : `${formatRange(next.start, next.end)} · ${inDays(diffDays(today, next.start))}`}
          </Body>
          <Body muted style={{ fontSize: 14 }}>
            {`Dashed days are when your next ${labels.periodLower} is most likely. Dotted days show the wider range it could fall in. Tap any day to add or change notes.`}
          </Body>
        </Card>
      ) : (
        <Card>
          <Body muted>{`Tap a day to mark it as ${labels.periodLower === 'entry' ? 'an entry' : `a ${labels.periodLower}`} day. Predictions appear once one is logged.`}</Body>
        </Card>
      )}
    </Screen>
  );
}
