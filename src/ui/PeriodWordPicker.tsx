import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { labelsFor, MAX_PERIOD_WORD_LENGTH, normalizePeriodWord, PERIOD_WORD_SUGGESTIONS } from '../vocabulary';
import { Body, Chip, ChipGroup } from './components';
import { radius, spacing, useColors } from './theme';

/**
 * Lets the user type their own word for "period", with a few suggestions and
 * a live example of how it reads in the app.
 */
export function PeriodWordPicker({ value, onChange }: { value: string; onChange: (word: string) => void }) {
  const c = useColors();
  const [text, setText] = useState(value);
  const word = normalizePeriodWord(text);
  const labels = labelsFor('neutral', word);

  const change = (next: string) => {
    setText(next);
    onChange(normalizePeriodWord(next));
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        accessibilityLabel="Your word"
        value={text}
        onChangeText={change}
        onBlur={() => setText(word)}
        placeholder="Type any word"
        placeholderTextColor={c.muted}
        maxLength={MAX_PERIOD_WORD_LENGTH}
        autoCorrect={false}
        returnKeyType="done"
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
      />
      <ChipGroup>
        {PERIOD_WORD_SUGGESTIONS.map((s) => (
          <Chip key={s} label={s} selected={word === s} onPress={() => change(s)} />
        ))}
      </ChipGroup>
      <Body muted style={styles.example}>
        {`Shows as: "${labels.nextIn(14)}" · "${labels.dayOfPeriod(2)}"`}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 16 },
  example: { fontSize: 14 },
});
